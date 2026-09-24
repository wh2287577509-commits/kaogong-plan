(function attachScheduleData(global) {
  const dayModes = [
    { id: "normal", label: "正常", hint: "默认轻学习" },
    { id: "late", label: "晚归", hint: "只保不断档" },
    { id: "tired", label: "很累", hint: "先恢复" },
    { id: "restday", label: "休息日", hint: "3-4 小时" },
    { id: "recovery", label: "休整", hint: "不硬撑" },
  ];

  const workdayTemplate = {
    id: "workday",
    title: "正常工作日计划",
    targetText: "默认 30 分钟轻学习，晚归或很累时一键降级",
    items: [
      { id: "wake", time: "06:30", label: "起床/准备上班", kind: "binary" },
      { id: "arriveHome", time: "19:00-19:40", label: "到家、吃饭、缓冲", kind: "binary" },
      { id: "lightStudy", time: "19:40-20:10", label: "轻学习/面试准备", kind: "progress" },
      { id: "freeBuffer", time: "20:10-20:30", label: "自由缓冲", kind: "binary" },
      { id: "windDown", time: "20:30-21:00", label: "洗漱、收尾、准备睡觉", kind: "binary" },
      { id: "sleep", time: "21:00", label: "睡觉", kind: "sleep" },
    ],
  };

  const lateWorkdayTemplate = {
    id: "lateWorkday",
    title: "晚归保温计划",
    targetText: "晚归日不硬学，完成 5-10 分钟最低维护就算不断档",
    items: [
      { id: "wake", time: "06:30", label: "起床/准备上班", kind: "binary" },
      { id: "minimumStudy", time: "到家后 5-10 分钟", label: "最低维护", kind: "progress" },
      { id: "windDown", time: "睡前", label: "洗漱收尾", kind: "binary" },
      { id: "sleep", time: "21:00", label: "尽量按时睡觉", kind: "sleep" },
    ],
  };

  const tiredWorkdayTemplate = {
    id: "tiredWorkday",
    title: "疲惫恢复计划",
    targetText: "很累时不强制学习，记录状态并守住睡觉",
    items: [
      { id: "wake", time: "06:30", label: "起床/准备上班", kind: "binary" },
      { id: "stateRecord", time: "晚上", label: "记录今天状态", kind: "binary" },
      { id: "windDown", time: "20:30-21:00", label: "洗漱收尾", kind: "binary" },
      { id: "sleep", time: "21:00", label: "睡觉", kind: "sleep" },
    ],
  };

  const recoveryTemplate = {
    id: "recovery",
    title: "主动休整",
    targetText: "今天以恢复为主，记录原因，不算失败",
    items: [
      { id: "recoveryReason", time: "今天", label: "记录休整原因", kind: "binary" },
      { id: "windDown", time: "睡前", label: "洗漱收尾", kind: "binary" },
      { id: "sleep", time: "21:00", label: "睡觉", kind: "sleep" },
    ],
  };

  const restdayTemplate = {
    id: "restday",
    title: "休息日作息",
    targetText: "学习 3-4 小时，不指定学习内容",
    targetMinutes: 180,
    excellentMinutes: 240,
    segments: [
      { id: "morning", label: "上午学习" },
      { id: "afternoon", label: "下午学习" },
    ],
  };

  function getTemplateForDayType(type) {
    return type.id === "workday" || type.id === "adjusted-workday"
      ? workdayTemplate
      : restdayTemplate;
  }

  function getDefaultDayMode(type) {
    return type.id === "workday" || type.id === "adjusted-workday" ? "normal" : "restday";
  }

  function getTemplateForMode(mode) {
    const templates = {
      normal: workdayTemplate,
      late: lateWorkdayTemplate,
      tired: tiredWorkdayTemplate,
      restday: restdayTemplate,
      recovery: recoveryTemplate,
    };
    return templates[mode] || workdayTemplate;
  }

  function getTemplateForRecord(type, record = {}) {
    return getTemplateForMode(record.dayMode || getDefaultDayMode(type));
  }

  const api = {
    dayModes,
    getDefaultDayMode,
    getTemplateForDayType,
    getTemplateForMode,
    getTemplateForRecord,
    lateWorkdayTemplate,
    recoveryTemplate,
    restdayTemplate,
    tiredWorkdayTemplate,
    workdayTemplate,
  };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.scheduleData = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
