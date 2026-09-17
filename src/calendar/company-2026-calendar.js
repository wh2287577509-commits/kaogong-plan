(function attachCompanyCalendar(global) {
  const legalHolidayDates = new Set([
    "2026-01-01",
    "2026-02-16",
    "2026-02-17",
    "2026-02-18",
    "2026-02-19",
    "2026-04-05",
    "2026-05-01",
    "2026-06-19",
    "2026-09-25",
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
  ]);

  const publicRestOverrides = new Set([
    "2026-01-02",
    "2026-02-20",
    "2026-02-23",
    "2026-04-06",
    "2026-05-04",
    "2026-05-05",
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
  ]);

  const companyLeaveDates = new Set([
    "2026-02-24",
    "2026-08-03",
    "2026-08-04",
    "2026-08-05",
    "2026-08-06",
    "2026-08-07",
  ]);

  const dayTypeMeta = {
    workday: { id: "workday", label: "工作日", tone: "neutral" },
    "adjusted-workday": { id: "adjusted-workday", label: "调休上班", tone: "work" },
    "public-rest": { id: "public-rest", label: "公休日", tone: "rest" },
    "legal-holiday": { id: "legal-holiday", label: "法定假日", tone: "holiday" },
    "company-leave": { id: "company-leave", label: "公司休假", tone: "company" },
  };

  function getDayType(date, formatDateKey) {
    const key = formatDateKey(date);
    const day = date.getDay();

    if (legalHolidayDates.has(key)) return dayTypeMeta["legal-holiday"];
    if (companyLeaveDates.has(key)) return dayTypeMeta["company-leave"];
    if (publicRestOverrides.has(key) || day === 0 || day === 6) {
      return dayTypeMeta["public-rest"];
    }
    return dayTypeMeta.workday;
  }

  const api = {
    companyLeaveDates,
    dayTypeMeta,
    getDayType,
    legalHolidayDates,
    publicRestOverrides,
  };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.calendar = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
