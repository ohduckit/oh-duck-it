(() => {
  const cfg = window.ODIT_SUPABASE || {};
  const configured =
    cfg.url &&
    cfg.key &&
    !cfg.url.startsWith('YOUR_') &&
    !cfg.key.startsWith('YOUR_') &&
    window.supabase?.createClient;

  const page = document.body?.dataset?.officerPage || 'overview';
  const permissionKey = document.body?.dataset?.officerPermission || 'officer.overview';

  const NAV = [
    { type:'group', label:'Recruitment' },
    { key:'applications', icon:'✉', label:'Applications', href:'officer-applications.html', status:'Live', permission:'recruitment.applications.manage' },
    { key:'recruitment-ownership', icon:'♟', label:'Recruitment Ownership', href:'officer-recruitment-ownership.html', status:'Live', permission:'recruitment.ownership.manage' },
    { key:'recruitment-priorities', icon:'◈', label:'Recruitment Priorities', href:'officer-recruitment-priorities.html', status:'Live', permission:'recruitment.priorities.manage' },

    { type:'group', label:'Raiding' },
    { key:'progression', icon:'⚔', label:'Progression', href:'officer-progression.html', status:'Live', permission:'progression.manage' },
    { key:'roster', icon:'♙', label:'Roster', href:'officer-roster.html', status:'Live', permission:'roster.manage' },
    { key:'raid-notes', icon:'⚑', label:'Raid Notes', href:'officer-raid-notes.html', status:'Planned', permission:'raid.notes.manage' },

    { type:'group', label:'Guild' },
    { key:'roles', icon:'♛', label:'Role Assignments', href:'officer-roles.html', status:'Live', permission:'structure.manage' },
    { key:'resources', icon:'🛠', label:'Resources', href:'officer-resources.html', status:'Live', permission:'resources.manage' },
    { key:'guild-info', icon:'📜', label:'Guild Information', href:'officer-guild-info.html', status:'Planned', permission:'guild.info.manage' },

    { type:'group', label:'Council' },
    { key:'officer-notes', icon:'📝', label:'Officer Notes', href:'officer-notes.html', status:'Planned', permission:'officer.notes.manage' },
    { key:'logs', icon:'☷', label:'Logs & Reports', href:'officer-logs.html', status:'Planned', permission:'logs.view' },

    { type:'group', label:'Administration' },
    { key:'permissions', icon:'⚙', label:'Permissions', href:'officer-permissions.html', status:'Planned', permission:'permissions.manage' },
    { key:'settings', icon:'🔧', label:'Settings', href:'officer-settings.html', status:'Planned', permission:'settings.manage' }
  ];

  const LEGACY_HASHES = {
    '#overview':'officers.html',
    '#applications':'officer-applications.html',
    '#roster':'officer-roster.html',
    '#raid-notes':'officer-raid-notes.html',
    '#officer-notes':'officer-notes.html',
    '#admin':'officers.html'
  };

  if (page === 'overview' && LEGACY_HASHES[location.hash] && location.hash !== '#overview') {
    location.replace(LEGACY_HASHES[location.hash]);
    return;
  }

  const authView = document.getElementById('authView');
  const portalView = document.getElementById('portalView');
  const authNotice = document.getElementById('authNotice');
  const authText = document.getElementById('authText');
  const loginBtn = document.getElementById('discordLogin');
  const logoutBtnAuth = document.getElementById('logoutBtnAuth');
  const unauthorisedBox = document.getElementById('unauthorisedBox');
  const nav = document.getElementById('officerNav');

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const metaName = u =>
    u?.user_metadata?.full_name ||
    u?.user_metadata?.name ||
    u?.user_metadata?.preferred_username ||
    u?.email ||
    'Officer';

  const show = (el, text, kind='info') => {
    if (!el) return;
    el.hidden = false;
    el.className = `notice ${kind}`;
    el.textContent = text;
  };

  function renderDenied() {
    if (!unauthorisedBox) return;
    unauthorisedBox.hidden = false;
    unauthorisedBox.innerHTML = `
      <div class="notice error" style="margin-top:14px">
        This Discord account is not authorised for officer access.
      </div>
      <p class="help" style="margin-top:12px">
        If you are looking to join Oh Duck It, please use the Recruitment page.
        Officer access is granted internally by the Tavern Council.
      </p>
      <div class="actions" style="justify-content:flex-start">
        <a class="btn primary" href="recruitment.html">Go to Recruitment</a>
        <a class="btn" href="index.html">Return Home</a>
      </div>
    `;
  }

  function renderNav() {
    if (!nav) return;

    const parts = [
      `<a href="officers.html" class="${page === 'overview' ? 'active' : ''}">
        <span class="ico">⌂</span><span>Overview</span>
      </a>`
    ];

    for (const item of NAV) {
      if (item.type === 'group') {
        parts.push(`<div class="officer-nav-group">${esc(item.label)}</div>`);
        continue;
      }

      parts.push(`
        <a href="${esc(item.href)}"
           class="${item.key === page ? 'active' : ''}"
           data-officer-key="${esc(item.key)}"
           data-permission-key="${esc(item.permission)}">
          <span class="ico">${item.icon}</span>
          <span>${esc(item.label)}</span>
          <span class="nav-status">${esc(item.status)}</span>
        </a>
      `);
    }

    nav.innerHTML = parts.join('');
  }

  renderNav();

  if (!configured) {
    if (loginBtn) loginBtn.disabled = true;
    show(authNotice, 'Officer backend is not configured.', 'error');
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.key);

  async function signOut() {
    await client.auth.signOut();
    location.reload();
  }

  loginBtn?.addEventListener('click', async () => {
    const redirectTo = window.location.href.split('#')[0].split('?')[0];
    const { error } = await client.auth.signInWithOAuth({
      provider:'discord',
      options:{ redirectTo }
    });
    if (error) show(authNotice, error.message, 'error');
  });

  document.getElementById('logoutBtn')?.addEventListener('click', signOut);
  logoutBtnAuth?.addEventListener('click', signOut);

  async function boot() {
    const { data:{ session }, error } = await client.auth.getSession();

    if (error) {
      show(authNotice, error.message, 'error');
      return;
    }

    const user = session?.user || null;
    if (!user) return;

    if (loginBtn) loginBtn.hidden = true;
    if (logoutBtnAuth) logoutBtnAuth.hidden = false;
    if (authText) authText.textContent = `Signed in as ${metaName(user)}. Checking officer access…`;

    const { data:isOfficer, error:officerError } = await client.rpc('is_officer');

    if (officerError) {
      show(authNotice, 'Could not verify officer access. Check the database setup.', 'error');
      return;
    }

    if (!isOfficer) {
      if (authText) authText.textContent = 'Signed in with Discord. This account does not have Officer Portal access.';
      renderDenied();
      return;
    }

    if (authView) authView.hidden = true;
    if (portalView) portalView.hidden = false;

    const identity = document.getElementById('officerIdentity');
    if (identity) identity.textContent = `Signed in as ${metaName(user)}.`;

    const detail = {
      ready: true,
      client,
      user,
      isOfficer: true,
      page,
      permissionKey,
      nav: NAV
    };

    window.ODIT_OFFICER = detail;
    window.dispatchEvent(new CustomEvent('odit:officer-ready', { detail }));

    // Compatibility bridge for management modules during the migration.
    window.ODIT_MANAGEMENT = detail;
    window.dispatchEvent(new CustomEvent('odit:management-ready', { detail }));
  }

  client.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') location.reload();
  });

  boot();
})();