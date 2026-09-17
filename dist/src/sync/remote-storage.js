(function attachRemoteStorage(global) {
  function getClient() {
    const config = global.ExamPlan?.supabaseConfig;
    const supabaseFactory = global.supabase;

    if (!config || !supabaseFactory?.createClient) {
      return null;
    }

    if (!global.ExamPlan.supabaseClient) {
      global.ExamPlan.supabaseClient = supabaseFactory.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_PUBLISHABLE_KEY,
      );
    }

    return global.ExamPlan.supabaseClient;
  }

  function hasClient() {
    return Boolean(getClient());
  }

  function getEmailRedirectTo() {
    if (global.location?.origin) return global.location.origin;
    return "http://localhost:3000";
  }

  async function getSession() {
    const client = getClient();
    if (!client) return { session: null, user: null, error: null };

    const { data, error } = await client.auth.getSession();
    return {
      session: data?.session || null,
      user: data?.session?.user || null,
      error,
    };
  }

  async function signUp(email, password) {
    const client = getClient();
    if (!client) throw new Error("Supabase 客户端未加载");
    return client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
      },
    });
  }

  async function resendSignupEmail(email) {
    const client = getClient();
    if (!client) throw new Error("Supabase 客户端未加载");
    return client.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getEmailRedirectTo(),
      },
    });
  }

  async function signIn(email, password) {
    const client = getClient();
    if (!client) throw new Error("Supabase 客户端未加载");
    return client.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    const client = getClient();
    if (!client) return;
    await client.auth.signOut();
  }

  async function updatePassword(password) {
    const client = getClient();
    if (!client) throw new Error("Supabase 客户端未加载");
    return client.auth.updateUser({ password });
  }

  async function loadRemoteRecords() {
    const client = getClient();
    const { user } = await getSession();
    if (!client || !user) return {};

    const { data, error } = await client
      .from("schedule_records")
      .select("record_date,data")
      .eq("user_id", user.id);

    if (error) throw error;

    return (data || {}).reduce((records, row) => {
      records[row.record_date] = row.data || {};
      return records;
    }, {});
  }

  async function saveRemoteRecord(dateKey, record) {
    const client = getClient();
    const { user } = await getSession();
    if (!client || !user) return { skipped: true };

    const { error } = await client.from("schedule_records").upsert(
      {
        user_id: user.id,
        record_date: dateKey,
        data: record,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,record_date" },
    );

    if (error) throw error;
    return { skipped: false };
  }

  async function syncAllLocalRecords(records) {
    const entries = Object.entries(records || {});
    for (const [dateKey, record] of entries) {
      await saveRemoteRecord(dateKey, record);
    }
    return entries.length;
  }

  const api = {
    getClient,
    getSession,
    hasClient,
    loadRemoteRecords,
    resendSignupEmail,
    saveRemoteRecord,
    signIn,
    signOut,
    signUp,
    syncAllLocalRecords,
    updatePassword,
  };

  global.ExamPlan = global.ExamPlan || {};
  global.ExamPlan.remoteStorage = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
