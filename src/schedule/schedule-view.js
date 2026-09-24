(function attachScheduleView(global) {
  function labelForStatus(status, kind) {
    const labels = {
      done: "完成",
      partial: "部分",
      missed: "未完成",
      onTime: "按时",
      late: "延迟",
    };
    if (!status) return kind === "sleep" ? "未记录" : "未选择";
    return labels[status] || "未选择";
  }

  function completionLabel(result, template) {
    if (template.id === "restday") {
      if (result.rested) return "已标记休整";
      if (result.minutes >= template.excellentMinutes) return "超额完成";
      if (result.minutes >= template.targetMinutes) return "已达标";
      return `还差 ${template.targetMinutes - result.minutes} 分钟达标`;
    }
    return `${result.completedUnits} / ${result.totalUnits} 项`;
  }

  function buildFeedback(template, completion, record) {
    if (template.id === "lateWorkday") {
      if (completion.percent >= 75) return "晚归日能守住最低维护就很好，别再给自己加码。";
      return "晚归日先保睡眠和记录，今天不需要用正常日标准要求自己。";
    }
    if (template.id === "tiredWorkday") {
      if (completion.percent >= 75) return "疲惫日能收住节奏就是合格，恢复本身也是计划的一部分。";
      return "今天重点不是多学，而是如实记录、早点睡，把明天留出来。";
    }
    if (template.id === "recovery") {
      return "主动休整不是失败，记录原因后就让身体真正缓下来。";
    }
    if (template.id === "restday") {
      if (record.restMode === "rest") return "今天是主动休整，不计入失败；记得让休息真的恢复精力。";
      if ((completion.minutes || 0) >= template.excellentMinutes) return "今天超过 4 小时，节奏很扎实，晚上可以早点收住。";
      if ((completion.minutes || 0) >= template.targetMinutes) return "今天已经达到休息日目标，保持这个轻稳节奏就好。";
      return "今天还没到 3 小时目标，可以补一小段，也可以如实记录原因。";
    }

    if (completion.percent >= 85) return "今天作息执行很好，重点守住 21:00 睡觉。";
    if (completion.percent >= 60) return "今天完成了大半，回看一下卡住的是哪一段。";
    return "今天先别急着否定自己，记录下来，明天优先守住第一段。";
  }

  function renderDayModeSelector(state) {
    const { dayMode, dayModes } = state;
    return `
      <section class="mode-panel" aria-label="今日状态">
        <div>
          <p class="eyebrow">每日只需要看这里</p>
          <h2>今日状态</h2>
        </div>
        <div class="mode-chips">
          ${dayModes
            .map((mode) => {
              return `
                <button class="mode-chip ${mode.id === dayMode ? "is-active" : ""}" data-day-mode="${mode.id}">
                  <strong>${mode.label}</strong>
                  <span>${mode.hint}</span>
                </button>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderTimeline(template, record) {
    return `
      <div class="timeline">
        ${template.items
          .map((item) => {
            const status = record.statuses?.[item.id] || "";
            return `
              <div class="timeline-row">
                <time>${item.time}</time>
                <div>
                  <strong>${item.label}</strong>
                  <span>${item.kind === "progress" ? "学习/准备类可记录部分完成" : "作息类只记录执行情况"}</span>
                </div>
                <button class="status-button status-${status || "empty"}" data-status="${item.id}" data-kind="${item.kind}" data-value="${status}">
                  ${labelForStatus(status, item.kind)}
                </button>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderRestday(template, record, completion) {
    const segments = record.restSegments || {};
    const rested = record.restMode === "rest";
    return `
      <div class="rest-goal">
        <div>
          <span>学习目标</span>
          <strong>3-4 小时</strong>
        </div>
        <div>
          <span>已记录</span>
          <strong>${completion.minutes || 0} 分钟</strong>
        </div>
        <button class="rest-toggle ${rested ? "is-active" : ""}" data-rest-toggle>
          ${rested ? "已设为休整日" : "标记休整日"}
        </button>
      </div>
      <div class="rest-segments ${rested ? "is-muted" : ""}">
        ${template.segments
          .map((segment) => {
            return `
              <label class="minute-field">
                <span>${segment.label}</span>
                <input data-minutes="${segment.id}" type="number" min="0" step="5" value="${segments[segment.id] || ""}" placeholder="分钟">
              </label>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderSleepFeedback(record) {
    const feedback = record.sleepFeedback || {};
    const feeling = feedback.feeling || "";
    const wakeStatus = record.statuses?.wake || "";
    const shouldAskActualWakeTime = wakeStatus !== "done";
    const options = [
      ["", "未选择"],
      ["steady", "睡得踏实"],
      ["dreamy", "多梦"],
      ["interrupted", "中途醒"],
      ["tired", "醒来累"],
    ];

    return `
      <div class="sleep-feedback">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">可选</p>
            <h2>睡眠反馈</h2>
          </div>
        </div>
        <div class="sleep-fields">
          ${shouldAskActualWakeTime ? `
            <label>
              实际起床
              <input data-sleep-wake-time type="time" value="${feedback.actualWakeTime || ""}">
            </label>
          ` : ""}
          <label>
            睡眠感受
            <select data-sleep-feeling>
              ${options
                .map(([value, label]) => {
                  return `<option value="${value}" ${value === feeling ? "selected" : ""}>${label}</option>`;
                })
                .join("")}
            </select>
          </label>
        </div>
      </div>
    `;
  }

  function renderSchedule(state) {
    const {
      completion,
      dayMode = "normal",
      dayModes = global.ExamPlan?.scheduleData?.dayModes || [],
      dateKey,
      record,
      selectedDate,
      template,
      type,
      weekDays,
      getDayContext,
    } = state;

    return `
      <section class="week-strip" aria-label="本周日历">
        ${weekDays
          .map((day) => {
            const dayContext = getDayContext(day);
            const isSelected = dayContext.key === dateKey;
            return `
              <button class="day-card ${isSelected ? "is-selected" : ""}" data-date="${dayContext.key}">
                <span>${["日", "一", "二", "三", "四", "五", "六"][day.getDay()]}</span>
                <strong>${day.getMonth() + 1}/${day.getDate()}</strong>
                <em class="mini-tag mini-${dayContext.type.tone}">${dayContext.type.label}</em>
                <i style="--progress:${dayContext.completion.percent || 0}%"></i>
              </button>
            `;
          })
          .join("")}
      </section>

      ${renderDayModeSelector({ dayMode, dayModes })}

      <main class="layout">
        <section class="panel schedule-panel">
          <div class="section-heading">
            <div>
              <p class="eyebrow">${type.label}</p>
              <h2>${template.title}</h2>
            </div>
            <div class="completion">
              <strong>${completion.percent || 0}%</strong>
              <span>${completionLabel(completion, template)}</span>
            </div>
          </div>
          ${template.id === "restday" ? renderRestday(template, record, completion) : renderTimeline(template, record)}
        </section>

        <aside class="panel summary-panel">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">可选</p>
              <h2>一句话总结</h2>
            </div>
          </div>
          <textarea data-summary placeholder="今天一句话总结，可不填">${record.summary || ""}</textarea>
          ${renderSleepFeedback(record)}
          <div class="feedback">
            <span>今日反馈</span>
            <p>${buildFeedback(template, completion, record)}</p>
          </div>
        </aside>
      </main>
    `;
  }

  function formatShortList(items, emptyText) {
    if (!items.length) return emptyText;
    return items.slice(0, 6).map((item) => item.slice(5)).join("、") + (items.length > 6 ? " 等" : "");
  }

  function monthAdvice(monthOverview) {
    if (!monthOverview.recordedDays) return "这个月还没有记录，先从今天开始留下一条真实数据。";
    if (monthOverview.averageWorkdayPercent >= 80) return "工作日整体很稳，接下来主要守住睡觉和休息日节奏。";
    if (monthOverview.averageWorkdayPercent >= 55) {
      return `这个月已经有基础，优先照看“${monthOverview.weakestItem.label}”这一环。`;
    }
    return "这个月先别追求满格，优先把每天最小记录动作保住。";
  }

  function renderStats(state) {
    const { monthOverview, statsScope } = state;
    const monthValue = `${monthOverview.selectedYear}-${String(monthOverview.selectedMonth).padStart(2, "0")}`;

    return `
      <section class="panel stats-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">统计回看</p>
            <h2>${monthOverview.label}</h2>
          </div>
          <div class="stats-controls">
            <label class="month-picker">
              <select data-month-picker aria-label="选择月份">
                ${Array.from({ length: 12 }, (_, index) => {
                  const month = index + 1;
                  const value = `${monthOverview.selectedYear}-${String(month).padStart(2, "0")}`;
                  return `<option value="${value}" ${value === monthValue ? "selected" : ""}>${monthOverview.selectedYear}年 ${month}月</option>`;
                }).join("")}
              </select>
            </label>
            <div class="scope-tabs" aria-label="统计范围">
              <button disabled title="后续添加">本周</button>
              <button data-stats-scope="month" class="${statsScope === "month" ? "is-active" : ""}">本月</button>
              <button disabled title="后续添加">本年</button>
            </div>
          </div>
        </div>

        <div class="month-overview">
          <div>
            <span>本月记录</span>
            <strong>${monthOverview.recordedDays} 天</strong>
          </div>
          <div>
            <span>工作日平均完成率</span>
            <strong>${monthOverview.averageWorkdayPercent}%</strong>
          </div>
          <div>
            <span>休息日达标</span>
            <strong>${monthOverview.restdayTargetDays} 天</strong>
          </div>
          <div>
            <span>最容易卡住</span>
            <strong>${monthOverview.weakestItem.label}</strong>
          </div>
          <div>
            <span>睡眠评分</span>
            <strong>${monthOverview.sleepScoreAverage} 分</strong>
            <small>${monthOverview.sleepFeedbackDays} 天已评</small>
          </div>
        </div>

        <div class="month-section">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">点击日期查看当天</p>
              <h2>月历热力图</h2>
            </div>
          </div>
          <div class="month-weekdays">
            ${["一", "二", "三", "四", "五", "六", "日"].map((label) => `<span>${label}</span>`).join("")}
          </div>
          <div class="month-grid" style="--month-offset:${(monthOverview.days[0].date.getDay() + 6) % 7}">
            ${monthOverview.days
              .map((day) => {
                return `
                  <button class="month-day heat-${day.heat}" data-month-date="${day.key}" title="${day.key} ${day.type.label}">
                    <span>${day.date.getDate()}</span>
                    <em class="mini-tag mini-${day.type.tone}">${day.type.label}</em>
                    <i>${day.hasRecord ? `${day.completion.percent || 0}%` : "未记"}</i>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>

        <div class="month-review">
          <div>
            <p class="eyebrow">本月问题盘点</p>
            <h2>哪里最需要照看</h2>
          </div>
          <ul>
            <li>未记录：${formatShortList(monthOverview.missedDays, "暂时没有")}</li>
            <li>主动休整：${formatShortList(monthOverview.restedDays, "暂时没有")}</li>
            <li>工作日薄弱项：${monthOverview.weakestItem.label}</li>
            <li>建议：${monthAdvice(monthOverview)}</li>
          </ul>
        </div>
      </section>
    `;
  }

  const api = { renderSchedule, renderStats };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.scheduleView = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
