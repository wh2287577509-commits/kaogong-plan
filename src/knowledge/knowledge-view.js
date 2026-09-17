(function attachKnowledgeView(global) {
  function renderKnowledgePlaceholder() {
    return `
      <section class="panel placeholder-panel">
        <p class="eyebrow">未开始</p>
        <h2>知识点盘点</h2>
        <p>这里后续会放行测、申论、常识的掌握状态、熟练度和复盘记录。</p>
      </section>
    `;
  }

  const api = { renderKnowledgePlaceholder };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.knowledgeView = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
