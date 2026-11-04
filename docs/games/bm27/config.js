// MSHSAA Basketball Manager 27 — public Supabase configuration
// v2.7.27: canonical project connection + verified direct auth flow.
// The project URL and publishable key are public browser configuration.
// NEVER place a service-role key in this file.
(() => {
  const STORAGE_KEY = 'bm27_public_cloud_config_v1';
  const canonical = {
    SUPABASE_URL: 'https://nnycfawjwhfcfpywgvpk.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_1ktGGqaGLbV0cYn7woWgMQ_vQjhkDyL',
    USERNAME_DOMAIN: 'accounts.mshsaabbm27.com',
    SCHOOL_SEASON: '2025-2026'
  };

  // The shipped project connection is authoritative. This prevents an old/bad
  // repair value in localStorage from overriding a corrected game update.
  window.MSHSAA_BM27_CONFIG = { ...canonical };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(canonical)); } catch {}
})();
