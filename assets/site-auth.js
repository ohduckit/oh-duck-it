(() => {
  const DAY_KEY = 'odit-officer-utc-day';
  const CFG_SRC = 'assets/supabase-config.js';
  const SUPABASE_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  const currentUtcDay = () => new Date().toISOString().slice(0, 10);

  function currentPage() {
    const page = location.pathname.split('/').pop();
    return page || 'index.html';
  }

  function removeOfficerLinks() {
    document.querySelectorAll('.site-links .officer-link, .site-links .management-link')
      .forEach(link => link.remove());
  }

  function addOfficerLinks() {
    document.querySelectorAll('.site-links').forEach(nav => {
      nav.querySelectorAll('.officer-link, .management-link').forEach(link => link.remove());

      const page = currentPage();

      const officer = document.createElement('a');
      officer.href = 'officers.html';
      officer.textContent = 'Officer Portal';
      officer.className = 'officer-link';
      if (page === 'officers.html') {
        officer.classList.add('active');
        officer.setAttribute('aria-current', 'page');
      }

      const management = document.createElement('a');
      management.href = 'guild-management.html';
      management.textContent = 'Guild Management';
      management.className = 'management-link';
      if (page === 'guild-management.html') {
        management.classList.add('active');
        management.setAttribute('aria-current', 'page');
      }

      nav.append(officer, management);
    });
  }

  function loadScript(src, marker) {
    return new Promise((resolve, reject) => {
      if (marker && window[marker]) {
        resolve();
        return;
      }

      const existing = [...document.scripts].find(s => s.src === new URL(src, location.href).href);
      if (existing) {
        if (!marker || window[marker]) resolve();
        else {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function ensureDependencies() {
    if (!window.supabase?.createClient) {
      await loadScript(SUPABASE_SRC, 'supabase');
    }

    if (!window.ODIT_SUPABASE?.url || !window.ODIT_SUPABASE?.key) {
      await loadScript(CFG_SRC, 'ODIT_SUPABASE');
    }

    return Boolean(
      window.supabase?.createClient &&
      window.ODIT_SUPABASE?.url &&
      window.ODIT_SUPABASE?.key
    );
  }

  async function signOutForExpiry(client) {
    sessionStorage.removeItem(DAY_KEY);
    try {
      await client.auth.signOut();
    } catch (error) {
      console.warn('ODit automatic officer sign-out failed:', error);
    }

    removeOfficerLinks();

    const page = currentPage();
    if (page === 'officers.html' || page === 'guild-management.html') {
      location.reload();
    }
  }

  function scheduleUtcMidnight(client) {
    const now = new Date();
    const nextMidnightUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 250
    );

    const delay = Math.max(1000, nextMidnightUtc - Date.now());

    window.setTimeout(async () => {
      await signOutForExpiry(client);
    }, delay);
  }

  async function syncOfficerNavigation() {
    removeOfficerLinks();

    const ready = await ensureDependencies();
    if (!ready) return;

    const cfg = window.ODIT_SUPABASE;
    const client = window.supabase.createClient(cfg.url, cfg.key);

    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) return;

    const storedDay = sessionStorage.getItem(DAY_KEY);
    const today = currentUtcDay();

    if (storedDay && storedDay !== today) {
      await signOutForExpiry(client);
      return;
    }

    const { data: isOfficer, error: officerError } = await client.rpc('is_officer');
    if (officerError || !isOfficer) {
      removeOfficerLinks();
      return;
    }

    if (!storedDay) {
      sessionStorage.setItem(DAY_KEY, today);
    }

    addOfficerLinks();
    scheduleUtcMidnight(client);

    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(DAY_KEY);
        removeOfficerLinks();
      }
    });
  }

  syncOfficerNavigation().catch(error => {
    console.warn('ODit officer navigation could not initialise:', error);
    removeOfficerLinks();
  });
})();
