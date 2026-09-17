import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const dateUtils = require("../src/shared/date.js");
const calendar = require("../src/calendar/company-2026-calendar.js");
const scheduleData = require("../src/schedule/schedule-data.js");
const scheduleStats = require("../src/schedule/schedule-stats.js");
const scheduleView = require("../src/schedule/schedule-view.js");

test("index loads classic scripts from modular folders for local file opening", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const controller = readFileSync(
    new URL("../src/schedule/schedule-controller.js", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(html, /type="module"/);
  assert.match(html, /@supabase\/supabase-js@2/);
  assert.match(html, /src="\.\/src\/shared\/date\.js\?v=/);
  assert.match(html, /src="\.\/src\/calendar\/company-2026-calendar\.js\?v=/);
  assert.match(html, /src="\.\/src\/sync\/supabase-config\.js\?v=/);
  assert.match(html, /src="\.\/src\/sync\/remote-storage\.js\?v=/);
  assert.match(html, /src="\.\/src\/schedule\/schedule-controller\.js\?v=/);
  assert.match(controller, /作息记录/);
  assert.match(controller, /知识点盘点/);
  assert.match(controller, /统计回看/);
  assert.match(controller, /备份管理/);
  assert.match(controller, /云同步/);
  assert.match(controller, /未登录，点击登录同步/);
  assert.match(controller, /data-open-sync/);
});

test("supabase config uses only the publishable frontend key", () => {
  const config = require("../src/sync/supabase-config.js");

  assert.equal(config.SUPABASE_URL, "https://knlbmpkowfsqhvlobomq.supabase.co");
  assert.equal(config.SUPABASE_PUBLISHABLE_KEY, "sb_publishable_emnnnuU3B4oAWUaa4HHwWw_rlRA6Zet");
  assert.doesNotMatch(config.SUPABASE_PUBLISHABLE_KEY, /secret|service_role/i);
});

test("sync module supports redirect-aware signup confirmation resending", () => {
  const remoteStorageSource = readFileSync(
    new URL("../src/sync/remote-storage.js", import.meta.url),
    "utf8",
  );
  const controller = readFileSync(
    new URL("../src/schedule/schedule-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(remoteStorageSource, /function resendSignupEmail/);
  assert.match(remoteStorageSource, /emailRedirectTo/);
  assert.match(controller, /重发验证邮件/);
  assert.match(controller, /otp_expired/);
});

test("sync module supports password recovery redirects", () => {
  const remoteStorageSource = readFileSync(
    new URL("../src/sync/remote-storage.js", import.meta.url),
    "utf8",
  );
  const controller = readFileSync(
    new URL("../src/schedule/schedule-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(remoteStorageSource, /function updatePassword/);
  assert.match(remoteStorageSource, /auth\.updateUser/);
  assert.match(controller, /readAuthRedirectType/);
  assert.match(controller, /"recovery"/);
  assert.match(controller, /设置新密码/);
  assert.match(controller, /data-reset-password/);
});

test("controller displays persisted logged-in Supabase session state", () => {
  const controller = readFileSync(
    new URL("../src/schedule/schedule-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(controller, /currentUserEmail/);
  assert.match(controller, /refreshSessionState/);
  assert.match(controller, /app\.remoteStorage\.getSession/);
  assert.match(controller, /已登录/);
});

test("classifies company calendar dates for schedule templates", () => {
  const normalWorkday = new Date("2026-09-16T12:00:00+08:00");
  const weekend = new Date("2026-09-19T12:00:00+08:00");
  const nationalDay = new Date("2026-10-01T12:00:00+08:00");

  assert.equal(calendar.getDayType(normalWorkday, dateUtils.formatDateKey).id, "workday");
  assert.equal(calendar.getDayType(weekend, dateUtils.formatDateKey).id, "public-rest");
  assert.equal(calendar.getDayType(nationalDay, dateUtils.formatDateKey).id, "legal-holiday");
});

test("uses workday and rest-day templates based on company calendar day type", () => {
  const workdayType = calendar.getDayType(
    new Date("2026-09-16T12:00:00+08:00"),
    dateUtils.formatDateKey,
  );
  const restType = calendar.getDayType(
    new Date("2026-09-19T12:00:00+08:00"),
    dateUtils.formatDateKey,
  );

  assert.equal(scheduleData.getTemplateForDayType(workdayType).id, "workday");
  assert.equal(scheduleData.getTemplateForDayType(restType).id, "restday");
});

test("uses a sustainable workday routine by default", () => {
  const wake = scheduleData.workdayTemplate.items.find((item) => {
    return item.id === "wake";
  });
  const morningStudy = scheduleData.workdayTemplate.items.find((item) => {
    return item.id === "morningStudy";
  });
  const eveningRest = scheduleData.workdayTemplate.items.find((item) => {
    return item.id === "eveningRest";
  });
  const eveningFocus = scheduleData.workdayTemplate.items.find((item) => {
    return item.id === "eveningFocus";
  });

  assert.equal(scheduleData.workdayTemplate.targetText, "早间学习 50 分钟 + 晚间轻任务 30 分钟，保留真实休息");
  assert.equal(wake.time, "06:30");
  assert.equal(morningStudy.time, "06:40-07:30");
  assert.equal(eveningRest.time, "19:30-20:00");
  assert.equal(eveningRest.label, "放松/散步/洗澡/不学习");
  assert.equal(eveningFocus.time, "20:00-20:30");
  assert.equal(eveningFocus.label, "晚间轻学习或面试准备");
});

test("controller exposes save status for local and cloud sync", () => {
  const controller = readFileSync(
    new URL("../src/schedule/schedule-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(controller, /saveStatusMessage/);
  assert.match(controller, /本地已保存/);
  assert.match(controller, /云端已同步/);
  assert.match(controller, /云同步失败/);
  assert.match(controller, /data-save-status/);
});

test("calculates workday completion and rest-day study minutes", () => {
  const workdayResult = scheduleStats.calculateCompletion(scheduleData.workdayTemplate, {
    statuses: {
      wake: "done",
      morningStudy: "done",
      dinner: "done",
      eveningRest: "done",
      eveningFocus: "partial",
      windDown: "done",
      sleep: "late",
    },
  });

  assert.equal(workdayResult.completedUnits, 6);
  assert.equal(workdayResult.totalUnits, 7);
  assert.equal(workdayResult.percent, 86);

  const restRecord = { restSegments: { morning: 100, afternoon: 85 } };
  const restResult = scheduleStats.calculateCompletion(scheduleData.restdayTemplate, restRecord);

  assert.equal(scheduleStats.sumRestStudyMinutes(restRecord), 185);
  assert.equal(restResult.percent, 100);
});

test("calculates a month overview from daily schedule records", () => {
  const records = {
    "2026-09-01": {
      statuses: {
        wake: "done",
        morningStudy: "done",
        dinner: "done",
        eveningRest: "done",
        eveningFocus: "done",
        windDown: "done",
        sleep: "onTime",
      },
      sleepFeedback: { feeling: "steady" },
    },
    "2026-09-02": {
      statuses: {
        wake: "missed",
        morningStudy: "partial",
        dinner: "done",
        eveningRest: "done",
        eveningFocus: "missed",
        windDown: "done",
        sleep: "late",
      },
      sleepFeedback: { feeling: "dreamy" },
    },
    "2026-09-05": {
      restSegments: { morning: 90, afternoon: 95 },
      sleepFeedback: { feeling: "tired" },
    },
  };

  const overview = scheduleStats.calculateMonthOverview({
    calendar,
    dateUtils,
    records,
    scheduleData,
    selectedDate: new Date("2026-09-16T12:00:00+08:00"),
  });

  assert.equal(overview.label, "2026 年 9 月");
  assert.equal(overview.recordedDays, 3);
  assert.equal(overview.workdayRecords, 2);
  assert.equal(overview.restdayTargetDays, 1);
  assert.equal(overview.sleepFeedbackDays, 3);
  assert.equal(overview.sleepScoreTotal, 0);
  assert.equal(overview.sleepScoreAverage, 0);
  assert.equal(overview.averageWorkdayPercent, 79);
  assert.equal(overview.weakestItem.label, "起床");
  assert.equal(overview.days.length, 30);
  assert.equal(overview.days[0].key, "2026-09-01");
  assert.equal(overview.days[4].completion.percent, 100);
});

test("renders first-version month statistics with date drill-down controls", () => {
  const overview = scheduleStats.calculateMonthOverview({
    calendar,
    dateUtils,
    records: {
      "2026-09-01": {
        statuses: {
          wake: "done",
          morningStudy: "done",
          dinner: "done",
          eveningRest: "done",
          eveningFocus: "done",
          windDown: "done",
          sleep: "onTime",
        },
      },
    },
    scheduleData,
    selectedDate: new Date("2026-09-16T12:00:00+08:00"),
  });

  const html = scheduleView.renderStats({ monthOverview: overview, statsScope: "month" });

  assert.match(html, /data-stats-scope="month"/);
  assert.match(html, /data-month-picker/);
  assert.match(html, /2026年 9月/);
  assert.match(html, /2026 年 9 月/);
  assert.match(html, /月历热力图/);
  assert.match(html, /data-month-date="2026-09-01"/);
  assert.match(html, /工作日平均完成率/);
  assert.match(html, /睡眠评分/);
  assert.match(html, /天已评/);
  assert.match(html, /本月问题盘点/);
});

test("controller supports changing the statistics month from a month picker", () => {
  const controller = readFileSync(
    new URL("../src/schedule/schedule-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(controller, /data-month-picker/);
  assert.match(controller, /selectedDate = new Date\(year, month - 1, 1\)/);
});

test("daily schedule includes optional sleep feedback fields", () => {
  const html = scheduleView.renderSchedule({
    completion: { completedUnits: 0, totalUnits: 7, percent: 0 },
    dateKey: "2026-09-16",
    getDayContext: () => ({
      completion: { percent: 0 },
      key: "2026-09-16",
      type: { label: "工作日", tone: "neutral" },
    }),
    record: {
      sleepFeedback: {
        actualWakeTime: "06:45",
        feeling: "dreamy",
      },
    },
    selectedDate: new Date("2026-09-16T12:00:00+08:00"),
    template: scheduleData.workdayTemplate,
    type: { label: "工作日" },
    weekDays: [new Date("2026-09-16T12:00:00+08:00")],
  });
  const controller = readFileSync(
    new URL("../src/schedule/schedule-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(html, /睡眠反馈/);
  assert.match(html, /data-sleep-wake-time/);
  assert.match(html, /data-sleep-feeling/);
  assert.match(html, /selected>多梦/);
  assert.match(controller, /sleepFeedback/);
  assert.match(controller, /data-sleep-wake-time/);
  assert.match(controller, /data-sleep-feeling/);
});

test("actual wake time only appears when planned wake-up is not completed", () => {
  const baseState = {
    completion: { completedUnits: 0, totalUnits: 7, percent: 0 },
    dateKey: "2026-09-16",
    getDayContext: () => ({
      completion: { percent: 0 },
      key: "2026-09-16",
      type: { label: "工作日", tone: "neutral" },
    }),
    selectedDate: new Date("2026-09-16T12:00:00+08:00"),
    template: scheduleData.workdayTemplate,
    type: { label: "工作日" },
    weekDays: [new Date("2026-09-16T12:00:00+08:00")],
  };

  const missedWakeHtml = scheduleView.renderSchedule({
    ...baseState,
    record: { statuses: { wake: "missed" } },
  });
  const unselectedWakeHtml = scheduleView.renderSchedule({
    ...baseState,
    record: { statuses: {} },
  });
  const completedWakeHtml = scheduleView.renderSchedule({
    ...baseState,
    record: { statuses: { wake: "done" } },
  });

  assert.match(missedWakeHtml, /data-sleep-wake-time/);
  assert.match(unselectedWakeHtml, /data-sleep-wake-time/);
  assert.doesNotMatch(completedWakeHtml, /data-sleep-wake-time/);
  assert.match(completedWakeHtml, /data-sleep-feeling/);
});
