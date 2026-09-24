(function attachScheduleStats(global) {
  function sumRestStudyMinutes(record = {}) {
    const segments = record.restSegments || {};
    return Object.values(segments).reduce((total, value) => {
      const minutes = Number(value);
      return Number.isFinite(minutes) ? total + minutes : total;
    }, 0);
  }

  function calculateCompletion(template, record = {}) {
    if (template.id === "restday") {
      if (record.restMode === "rest") {
        return { completedUnits: 0, totalUnits: 0, percent: 0, rested: true };
      }

      const minutes = sumRestStudyMinutes(record);
      return {
        completedUnits: minutes >= template.targetMinutes ? 1 : 0,
        totalUnits: 1,
        percent: Math.min(100, Math.round((minutes / template.targetMinutes) * 100)),
        minutes,
      };
    }

    const statuses = record.statuses || {};
    const scoreMap = {
      done: 1,
      onTime: 1,
      partial: 0.5,
      late: 0.5,
      missed: 0,
      empty: 0,
    };
    const completedUnits = template.items.reduce((total, item) => {
      return total + (scoreMap[statuses[item.id]] || 0);
    }, 0);
    const totalUnits = template.items.length;

    return {
      completedUnits,
      totalUnits,
      percent: Math.round((completedUnits / totalUnits) * 100),
    };
  }

  function eachDayOfMonth(selectedDate) {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const days = [];
    const cursor = new Date(year, month, 1);

    while (cursor.getMonth() === month) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  function classifyHeat(percent, hasRecord, rested) {
    if (!hasRecord) return "empty";
    if (rested) return "rested";
    if (percent >= 80) return "strong";
    if (percent >= 50) return "medium";
    return "low";
  }

  function calculateMonthOverview(options) {
    const { calendar, dateUtils, records, scheduleData, selectedDate } = options;
    const days = eachDayOfMonth(selectedDate).map((date) => {
      const key = dateUtils.formatDateKey(date);
      const type = calendar.getDayType(date, dateUtils.formatDateKey);
      const record = records[key] || {};
      const template = scheduleData.getTemplateForRecord
        ? scheduleData.getTemplateForRecord(type, record)
        : scheduleData.getTemplateForDayType(type);
      const hasRecord = Boolean(records[key]);
      const completion = calculateCompletion(template, record);

      return {
        completion,
        date,
        heat: classifyHeat(completion.percent || 0, hasRecord, completion.rested),
        hasRecord,
        key,
        record,
        template,
        type,
      };
    });

    const recordedDays = days.filter((day) => day.hasRecord).length;
    const workdays = days.filter((day) => day.template.id === "workday" && day.hasRecord);
    const restdays = days.filter((day) => day.template.id === "restday" && day.hasRecord);
    const restdayTargetDays = restdays.filter((day) => {
      return !day.completion.rested && (day.completion.minutes || 0) >= day.template.targetMinutes;
    }).length;
    const sleepScoreMap = {
      steady: 1,
      dreamy: 0,
      interrupted: -1,
      tired: -1,
    };
    const sleepScores = days
      .map((day) => sleepScoreMap[day.record.sleepFeedback?.feeling])
      .filter((score) => Number.isFinite(score));
    const sleepScoreTotal = sleepScores.reduce((total, score) => total + score, 0);
    const sleepScoreAverage = sleepScores.length
      ? Math.round((sleepScoreTotal / sleepScores.length) * 10) / 10
      : 0;
    const averageWorkdayPercent = workdays.length
      ? Math.round(workdays.reduce((total, day) => total + day.completion.percent, 0) / workdays.length)
      : 0;

    const weakestItem = scheduleData.workdayTemplate.items
      .map((item) => {
        const scores = workdays.map((day) => {
          const status = day.record.statuses?.[item.id] || "";
          if (status === "done" || status === "onTime") return 1;
          if (status === "partial" || status === "late") return 0.5;
          return 0;
        });
        const average = scores.length
          ? scores.reduce((total, score) => total + score, 0) / scores.length
          : 1;
        return { id: item.id, label: item.label, average };
      })
      .sort((left, right) => left.average - right.average)[0];

    const missedDays = days.filter((day) => !day.hasRecord).map((day) => day.key);
    const restedDays = days.filter((day) => day.record.restMode === "rest").map((day) => day.key);

    return {
      averageWorkdayPercent,
      days,
      label: `${selectedDate.getFullYear()} 年 ${selectedDate.getMonth() + 1} 月`,
      missedDays,
      recordedDays,
      restedDays,
      restdayRecords: restdays.length,
      restdayTargetDays,
      selectedMonth: selectedDate.getMonth() + 1,
      selectedYear: selectedDate.getFullYear(),
      sleepFeedbackDays: sleepScores.length,
      sleepScoreAverage,
      sleepScoreTotal,
      weakestItem,
      workdayRecords: workdays.length,
    };
  }

  const api = {
    calculateCompletion,
    calculateMonthOverview,
    sumRestStudyMinutes,
  };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.scheduleStats = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
