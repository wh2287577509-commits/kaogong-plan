(function attachSupabaseConfig(global) {
  const SUPABASE_URL = "https://knlbmpkowfsqhvlobomq.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_emnnnuU3B4oAWUaa4HHwWw_rlRA6Zet";

  const api = {
    SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_URL,
  };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.supabaseConfig = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
