(function attachScheduleData(global) {
  const workdayTemplate = {
    id: "workday",
    title: "工作日作息",
    targetText: "早间学习 50 分钟 + 晚间轻任务 30 分钟，保留真实休息",
    items: [
      { id: "wake", time: "06:30", label: "起床", kind: "binary" },
      { id: "morningStudy", time: "06:40-07:30", label: "早间学习", kind: "progress" },
      { id: "dinner", time: "18:30-19:30", label: "回家、准备、吃蛋/吃饭", kind: "binary" },
      { id: "eveningRest", time: "19:30-20:00", label: "放松/散步/洗澡/不学习", kind: "binary" },
      { id: "eveningFocus", time: "20:00-20:30", label: "晚间轻学习或面试准备", kind: "progress" },
      { id: "windDown", time: "20:30-21:00", label: "洗漱、收尾、准备睡觉", kind: "binary" },
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

  const api = { getTemplateForDayType, restdayTemplate, workdayTemplate };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.scheduleData = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
