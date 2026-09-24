(function attachScheduleController(global) {
  const app = global.ExamPlan;

  function statusOptions(kind) {
    if (kind === "binary") return ["done", "missed"];
    if (kind === "sleep") return ["onTime", "late"];
    return ["done", "partial", "missed"];
  }

  function nextStatus(current, kind) {
    const options = statusOptions(kind);
    const index = options.indexOf(current);
    return options[(index + 1) % options.length];
  }

  function downloadBackup(records) {
    const payload = app.storage.exportRecords(records);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `考公作息备份-${app.date.formatDateKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function initSchedulePage() {
    const root = document.querySelector("[data-app]");
    if (!root) return;

    let records = app.storage.loadRecords();
    let selectedDate = new Date();
    let activeSection = "schedule";
    let statsScope = "month";
    let syncMessage = readAuthRedirectMessage();
    let isPasswordRecovery = readAuthRedirectType() === "recovery";
    let currentUserEmail = "";
    let saveStatusMessage = "";
    if (syncMessage) activeSection = "sync";
    if (isPasswordRecovery) {
      syncMessage = "请设置一个新的登录密码。";
      activeSection = "sync";
    }

    const getDayContext = (date) => {
      const key = app.date.formatDateKey(date);
      const record = app.storage.getRecord(records, key);
      const type = app.calendar.getDayType(date, app.date.formatDateKey);
      const template = app.scheduleData.getTemplateForRecord(type, record);
      const completion = app.scheduleStats.calculateCompletion(template, record);
      return { completion, key, record, template, type };
    };

    const render = () => {
      const dateKey = app.date.formatDateKey(selectedDate);
      const context = getDayContext(selectedDate);
      const weekStart = app.date.getStartOfWeek(selectedDate);
      const weekDays = Array.from({ length: 7 }, (_, index) => app.date.addDays(weekStart, index));
      const size = app.storage.estimateSize(records);
      const recordCount = Object.keys(records).length;
      const cloudEnabled = app.remoteStorage?.hasClient();
      const syncButtonText = currentUserEmail
        ? `已登录：${currentUserEmail}`
        : cloudEnabled
          ? "未登录，点击登录同步"
          : "Supabase 未加载，当前仅本地保存";

      root.innerHTML = `
        <header class="app-header">
          <div>
            <p class="eyebrow">本地备考作息</p>
            <h1>考公作息记录</h1>
          </div>
          <div class="today-card">
            <span class="tag tag-${context.type.tone}">${context.type.label}</span>
            <strong>${dateKey}</strong>
            <span>${context.template.targetText}</span>
          </div>
        </header>

        <nav class="main-nav" aria-label="网站菜单">
          <button class="${activeSection === "schedule" ? "is-active" : ""}" data-section="schedule">作息记录</button>
          <button class="${activeSection === "knowledge" ? "is-active" : ""}" data-section="knowledge">知识点盘点</button>
          <button class="${activeSection === "stats" ? "is-active" : ""}" data-section="stats">统计回看</button>
          <button class="${activeSection === "sync" ? "is-active" : ""}" data-section="sync">云同步</button>
          <button class="${activeSection === "backup" ? "is-active" : ""}" data-section="backup">备份管理</button>
        </nav>

        <section class="backup-bar">
          <span>已记录 ${recordCount} 天，约 ${size} 字节</span>
          <span data-save-status>${saveStatusMessage || "等待记录"}</span>
          <button data-open-sync>${syncButtonText}</button>
          <button data-export>导出备份</button>
          <label>
            导入备份
            <input data-import type="file" accept="application/json">
          </label>
        </section>

        <div data-section-body>
          ${activeSection === "schedule"
            ? app.scheduleView.renderSchedule({
                ...context,
                dayMode: context.record.dayMode || app.scheduleData.getDefaultDayMode(context.type),
                dayModes: app.scheduleData.dayModes,
                dateKey,
                getDayContext,
                selectedDate,
                weekDays,
              })
            : renderPlaceholder(activeSection)}
        </div>
      `;

      bindEvents(root, context, dateKey);
    };

    const renderPlaceholder = (section) => {
      if (section === "knowledge") return app.knowledgeView.renderKnowledgePlaceholder();
      if (section === "stats") {
        const monthOverview = app.scheduleStats.calculateMonthOverview({
          calendar: app.calendar,
          dateUtils: app.date,
          records,
          scheduleData: app.scheduleData,
          selectedDate,
        });
        return app.scheduleView.renderStats({ monthOverview, statsScope });
      }
      if (section === "sync") return renderSyncPanel();
      return `
        <section class="panel placeholder-panel">
          <p class="eyebrow">已提供基础能力</p>
          <h2>备份管理</h2>
          <p>当前页面顶部已经可以导出和导入 JSON 备份。后续可以扩展成备份历史和容量提醒。</p>
        </section>
      `;
    };

    const renderSyncPanel = () => {
      return `
        <section class="panel placeholder-panel sync-panel">
          <p class="eyebrow">Supabase</p>
          <h2>云同步</h2>
          <p>登录后会把本地作息记录同步到 Supabase。没有登录时，数据仍然保存在本地浏览器。</p>
          ${isPasswordRecovery ? `
            <div class="reset-box">
              <label>
                新密码
                <input data-reset-password type="password" autocomplete="new-password" placeholder="输入新密码，建议至少 8 位">
              </label>
              <button data-reset-submit>设置新密码</button>
            </div>
          ` : ""}
          <div class="sync-form">
            <label>
              邮箱
              <input data-sync-email type="email" autocomplete="email" placeholder="你的邮箱">
            </label>
            <label>
              密码
              <input data-sync-password type="password" autocomplete="current-password" placeholder="Supabase 登录密码">
            </label>
          <div class="sync-actions">
            <button data-sync-signin>登录并同步</button>
            <button data-sync-signup>注册账号</button>
            <button data-sync-resend>重发验证邮件</button>
            <button data-sync-signout>退出登录</button>
          </div>
          </div>
          <p class="sync-status" data-sync-status>${syncMessage || "等待操作。"}</p>
        </section>
      `;
    };

    const setSyncStatus = (message) => {
      syncMessage = message;
      const status = root.querySelector("[data-sync-status]");
      if (status) status.textContent = message;
    };

    const refreshSessionState = async () => {
      if (!app.remoteStorage?.hasClient()) return;
      const { user } = await app.remoteStorage.getSession();
      currentUserEmail = user?.email || "";
      if (currentUserEmail && !syncMessage) {
        syncMessage = `已登录：${currentUserEmail}`;
      }
      render();
    };

    function readAuthRedirectMessage() {
      const params = new URLSearchParams(global.location.hash.replace(/^#/, ""));
      const code = params.get("error_code");
      const description = params.get("error_description");

      if (code === "otp_expired") {
        return "验证链接已过期或已失效。请填写邮箱后点击“重发验证邮件”，再点击最新邮件里的链接。";
      }
      if (description) return decodeURIComponent(description.replace(/\+/g, " "));
      return "";
    }

    function readAuthRedirectType() {
      const params = new URLSearchParams(global.location.hash.replace(/^#/, ""));
      return params.get("type") || "";
    }

    const mergeRemoteIntoLocal = async () => {
      const remoteRecords = await app.remoteStorage.loadRemoteRecords();
      records = { ...remoteRecords, ...records };
      app.storage.saveRecords(records);
      await app.remoteStorage.syncAllLocalRecords(records);
      return Object.keys(remoteRecords).length;
    };

    const syncCurrentRecord = async (dateKey, record) => {
      saveStatusMessage = "本地已保存";
      records = app.storage.loadRecords();
      render();
      if (!app.remoteStorage?.hasClient() || !currentUserEmail) return;
      try {
        await app.remoteStorage.saveRemoteRecord(dateKey, record);
        saveStatusMessage = "本地已保存，云端已同步";
      } catch (error) {
        console.warn("云同步失败", error);
        saveStatusMessage = "本地已保存，云同步失败";
      }
      render();
    };

    const bindEvents = (rootElement, context, dateKey) => {
      rootElement.querySelectorAll("[data-section]").forEach((button) => {
        button.addEventListener("click", () => {
          activeSection = button.dataset.section;
          render();
        });
      });

      rootElement.querySelectorAll("[data-stats-scope]").forEach((button) => {
        button.addEventListener("click", () => {
          statsScope = button.dataset.statsScope;
          render();
        });
      });

      const monthPicker = rootElement.querySelector("[data-month-picker]");
      if (monthPicker) {
        monthPicker.addEventListener("change", () => {
          const [year, month] = monthPicker.value.split("-").map(Number);
          selectedDate = new Date(year, month - 1, 1);
          render();
        });
      }

      rootElement.querySelector("[data-export]").addEventListener("click", () => {
        downloadBackup(records);
      });

      rootElement.querySelector("[data-open-sync]").addEventListener("click", () => {
        activeSection = "sync";
        render();
      });

      rootElement.querySelector("[data-import]").addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            records = app.storage.importRecords(reader.result);
            render();
          } catch (error) {
            alert(error.message);
          }
        };
        reader.readAsText(file);
      });

      const signinButton = rootElement.querySelector("[data-sync-signin]");
      if (signinButton) {
        signinButton.addEventListener("click", async () => {
          const email = rootElement.querySelector("[data-sync-email]").value.trim();
          const password = rootElement.querySelector("[data-sync-password]").value;
          if (!email || !password) {
            setSyncStatus("请先填写邮箱和密码。");
            return;
          }
          setSyncStatus("正在登录并同步...");
          try {
            const { error } = await app.remoteStorage.signIn(email, password);
            if (error) throw error;
            const { user } = await app.remoteStorage.getSession();
            currentUserEmail = user?.email || email;
            const remoteCount = await mergeRemoteIntoLocal();
            setSyncStatus(`同步完成：已合并 ${remoteCount} 条云端记录，并上传本地记录。`);
            render();
          } catch (error) {
            setSyncStatus(error.message || "登录或同步失败。");
          }
        });
      }

      const resetButton = rootElement.querySelector("[data-reset-submit]");
      if (resetButton) {
        resetButton.addEventListener("click", async () => {
          const password = rootElement.querySelector("[data-reset-password]").value;
          if (!password || password.length < 8) {
            setSyncStatus("新密码至少需要 8 位。");
            return;
          }
          setSyncStatus("正在设置新密码...");
          try {
            const { error } = await app.remoteStorage.updatePassword(password);
            if (error) throw error;
            isPasswordRecovery = false;
            global.history.replaceState({}, "", global.location.pathname);
            setSyncStatus("新密码已设置。现在可以用新密码登录并同步。");
            render();
          } catch (error) {
            setSyncStatus(error.message || "设置新密码失败。");
          }
        });
      }

      const signupButton = rootElement.querySelector("[data-sync-signup]");
      if (signupButton) {
        signupButton.addEventListener("click", async () => {
          const email = rootElement.querySelector("[data-sync-email]").value.trim();
          const password = rootElement.querySelector("[data-sync-password]").value;
          if (!email || !password) {
            setSyncStatus("请先填写邮箱和密码。");
            return;
          }
          setSyncStatus("正在注册...");
          try {
            const { error } = await app.remoteStorage.signUp(email, password);
            if (error) throw error;
            setSyncStatus("注册请求已提交。如果 Supabase 要求邮箱验证，请先去邮箱点击验证链接。");
          } catch (error) {
            setSyncStatus(error.message || "注册失败。");
          }
        });
      }

      const resendButton = rootElement.querySelector("[data-sync-resend]");
      if (resendButton) {
        resendButton.addEventListener("click", async () => {
          const email = rootElement.querySelector("[data-sync-email]").value.trim();
          if (!email) {
            setSyncStatus("请先填写邮箱。");
            return;
          }
          setSyncStatus("正在重发验证邮件...");
          try {
            const { error } = await app.remoteStorage.resendSignupEmail(email);
            if (error) throw error;
            setSyncStatus("验证邮件已重新发送，请打开最新邮件完成确认。");
          } catch (error) {
            setSyncStatus(error.message || "重发验证邮件失败。");
          }
        });
      }

      const signoutButton = rootElement.querySelector("[data-sync-signout]");
      if (signoutButton) {
        signoutButton.addEventListener("click", async () => {
          await app.remoteStorage.signOut();
          currentUserEmail = "";
          setSyncStatus("已退出登录。");
          render();
        });
      }

      rootElement.querySelectorAll("[data-date]").forEach((button) => {
        button.addEventListener("click", () => {
          const [year, month, day] = button.dataset.date.split("-").map(Number);
          selectedDate = new Date(year, month - 1, day);
          render();
        });
      });

      rootElement.querySelectorAll("[data-month-date]").forEach((button) => {
        button.addEventListener("click", () => {
          const [year, month, day] = button.dataset.monthDate.split("-").map(Number);
          selectedDate = new Date(year, month - 1, day);
          activeSection = "schedule";
          render();
        });
      });

      rootElement.querySelectorAll("[data-status]").forEach((button) => {
        button.addEventListener("click", async () => {
          const current = button.dataset.value || "";
          const itemId = button.dataset.status;
          const kind = button.dataset.kind;
          const next = nextStatus(current, kind);
          const nextRecord = {
            ...context.record,
            statuses: { ...(context.record.statuses || {}), [itemId]: next },
          };
          app.storage.setRecord(records, dateKey, nextRecord);
          await syncCurrentRecord(dateKey, nextRecord);
        });
      });

      rootElement.querySelectorAll("[data-day-mode]").forEach((button) => {
        button.addEventListener("click", async () => {
          const nextRecord = {
            ...context.record,
            dayMode: button.dataset.dayMode,
          };
          app.storage.setRecord(records, dateKey, nextRecord);
          await syncCurrentRecord(dateKey, nextRecord);
        });
      });

      rootElement.querySelectorAll("[data-minutes]").forEach((input) => {
        input.addEventListener("input", async () => {
          const nextRecord = {
            ...context.record,
            restMode: "",
            restSegments: {
              ...(context.record.restSegments || {}),
              [input.dataset.minutes]: Number(input.value) || 0,
            },
          };
          app.storage.setRecord(records, dateKey, nextRecord);
          await syncCurrentRecord(dateKey, nextRecord);
        });
      });

      const restToggle = rootElement.querySelector("[data-rest-toggle]");
      if (restToggle) {
        restToggle.addEventListener("click", async () => {
          const nextRecord = {
            ...context.record,
            restMode: context.record.restMode === "rest" ? "" : "rest",
          };
          app.storage.setRecord(records, dateKey, nextRecord);
          await syncCurrentRecord(dateKey, nextRecord);
        });
      }

      const summary = rootElement.querySelector("[data-summary]");
      if (summary) {
        summary.addEventListener("input", () => {
          const nextRecord = { ...context.record, summary: summary.value };
          app.storage.setRecord(records, dateKey, nextRecord);
          syncCurrentRecord(dateKey, nextRecord);
        });
      }

      const sleepWakeTime = rootElement.querySelector("[data-sleep-wake-time]");
      if (sleepWakeTime) {
        sleepWakeTime.addEventListener("input", () => {
          const nextRecord = {
            ...context.record,
            sleepFeedback: {
              ...(context.record.sleepFeedback || {}),
              actualWakeTime: sleepWakeTime.value,
            },
          };
          app.storage.setRecord(records, dateKey, nextRecord);
          syncCurrentRecord(dateKey, nextRecord);
        });
      }

      const sleepFeeling = rootElement.querySelector("[data-sleep-feeling]");
      if (sleepFeeling) {
        sleepFeeling.addEventListener("change", () => {
          const nextRecord = {
            ...context.record,
            sleepFeedback: {
              ...(context.record.sleepFeedback || {}),
              feeling: sleepFeeling.value,
            },
          };
          app.storage.setRecord(records, dateKey, nextRecord);
          syncCurrentRecord(dateKey, nextRecord);
        });
      }
    };

    render();
    refreshSessionState();
  }

  if (typeof document !== "undefined") {
    initSchedulePage();
  }

  const api = { initSchedulePage, nextStatus };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.scheduleController = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
