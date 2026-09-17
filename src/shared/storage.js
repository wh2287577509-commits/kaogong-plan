(function attachStorage(global) {
  const STORAGE_KEY = "civil-service-schedule-records";

  function getLocalStorage() {
    return typeof localStorage === "undefined" ? null : localStorage;
  }

  function loadRecords() {
    const store = getLocalStorage();
    if (!store) return {};

    try {
      return JSON.parse(store.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveRecords(records) {
    const store = getLocalStorage();
    if (!store) return;
    store.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function getRecord(records, dateKey) {
    return records[dateKey] || { statuses: {}, restSegments: {}, summary: "" };
  }

  function setRecord(records, dateKey, nextRecord) {
    records[dateKey] = nextRecord;
    saveRecords(records);
  }

  function exportRecords(records) {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        records,
      },
      null,
      2,
    );
  }

  function importRecords(payload) {
    const parsed = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object" || !parsed.records) {
      throw new Error("备份文件格式不正确");
    }
    saveRecords(parsed.records);
    return parsed.records;
  }

  function estimateSize(records) {
    return new Blob([JSON.stringify(records)]).size;
  }

  const api = {
    exportRecords,
    estimateSize,
    getRecord,
    importRecords,
    loadRecords,
    saveRecords,
    setRecord,
    STORAGE_KEY,
  };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.storage = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
