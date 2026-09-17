(function attachDateUtils(global) {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function getStartOfWeek(date) {
    const start = new Date(date);
    const day = start.getDay() || 7;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day + 1);
    return start;
  }

  function addDays(date, count) {
    const next = new Date(date);
    next.setDate(next.getDate() + count);
    return next;
  }

  const api = { addDays, formatDateKey, getStartOfWeek };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.date = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
