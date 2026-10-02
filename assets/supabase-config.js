/*
  Browser-safe Supabase configuration.

  The publishable key is intended for browser use when Row Level Security is
  configured correctly. Never place a secret/service-role key in this file.

  ODit officer sessions use sessionStorage instead of localStorage:
  - closing the tab/window clears the browser session
  - the shared site-auth layer also forces sign-out at 00:00 UTC
*/
window.ODIT_SUPABASE = {
  url: 'https://yeygdpgjbubjvlsvmazl.supabase.co',
  key: 'sb_publishable_xP9VwZ1PHctQu2OYvEiytg_LVXeM31T'
};

(() => {
  if (!window.supabase?.createClient || window.ODIT_SUPABASE_CLIENT_PATCHED) return;

  const baseCreateClient = window.supabase.createClient.bind(window.supabase);
  const cfg = window.ODIT_SUPABASE;

  // Remove the old persistent Supabase browser session once this deployment is live.
  // Officers will sign in again and the replacement session will live in sessionStorage.
  try {
    const projectRef = new URL(cfg.url).hostname.split('.')[0];
    const prefix = `sb-${projectRef}-auth-token`;

    Object.keys(localStorage)
      .filter(key => key.startsWith(prefix))
      .forEach(key => localStorage.removeItem(key));
  } catch (_) {}

  let singleton = null;
  let singletonUrl = '';
  let singletonKey = '';

  window.ODIT_CREATE_SUPABASE_CLIENT = (url, key, options = {}) => {
    if (singleton && singletonUrl === url && singletonKey === key) {
      return singleton;
    }

    const merged = {
      ...options,
      auth: {
        ...(options.auth || {}),
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    };

    singleton = baseCreateClient(url, key, merged);
    singletonUrl = url;
    singletonKey = key;
    window.ODIT_SUPABASE_CLIENT = singleton;
    return singleton;
  };

  window.supabase.createClient = window.ODIT_CREATE_SUPABASE_CLIENT;
  window.ODIT_SUPABASE_CLIENT_PATCHED = true;
})();
