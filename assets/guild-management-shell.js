(() => {
  const cfg = window.ODIT_SUPABASE || {};
  const configured =
    cfg.url &&
    cfg.key &&
    !cfg.url.startsWith('YOUR_') &&
    !cfg.key.startsWith('YOUR_') &&
    window.supabase?.createClient;

  const page = document.body?.dataset?.managementPage || 'overview';
  const permissionKey = document.body?.dataset?.managementPermission || 'management.overview';

  const PAGES = [
    { key:'overview', icon:'⌂', label:'Overview', href:'guild-management.html', status:'' , permission:'management.overview' },
    { key:'roles', icon:'♛', label:'Role Assignments', href:'guild-management-roles.html', status:'Live', permission:'structure.manage' },
    { key:'recruitment-ownership', icon:'♟', label:'Recruitment Ownership', href:'guild-management-recruitment-ownership.html', status:'Live', permission:'recruitment.ownership.manage' },
    { key:'progression', icon:'⚔', label:'Progression', href:'guild-management-progression.html', status:'Live', permission:'progression.manage' },
    { key:'recruitment', icon:'✉', label:'Recruitment Priorities', href:'guild-management-recruitment.html', status:'Live', permission:'recruitment.priorities.manage' },
    { key:'resources', icon:'🛠', label:'Resources', href:'guild-management-resources.html', status:'Live', permission:'resources.manage' },
    { key:'permissions', icon:'⚙', label:'Permissions', href:'guild-management-permissions.html', status:'Planned', permission:'permissions.manage' },
    { key:'guild-info', icon:'📜', label:'Guild Information', href:'guild-management-guild-info.html', status:'Planned', permission:'guild-info.manage' },
    { key:'logs', icon:'☷', label:'Logs & Reports', href:'guild-management-logs.html', status:'Planned', permission:'logs.view' },
    { key:'settings', icon:'🔧', label:'Settings', href:'guild-management-settings.html', status:'Planned', permission:'settings.manage' }
  ];

  const LEGACY_HASHES = {
    '#overview':'guild-management.html',
    '#roles':'guild-management-roles.html',
    '#recruitment-ownership':'guild-management-recruitment-ownership.html',
    '#progression':'guild-management-progression.html',
    '#recruitment':'guild-management-recruitment.html',
    '#resources':'guild-management-resources.html',
    '#permissions':'guild-management-permissions.html',
    '#guild-info':'guild-management-guild-info.html',
    '#logs':'guild-management-logs.html',
    '#settings':'guild-management-settings.html'
  };

  if (page === 'overview' && LEGACY_HASHES[location.hash] && location.hash !== '#overview') {
    location.replace(LEGACY_HASHES[location.hash]);
    return;
  }

  const authView = document.getElementById('authView');
  const managementView = document.getElementById('managementView');
  const authNotice = document.getElementById('authNotice');
  const authText = document.getElementById('authText');
  const loginBtn = document.getElementById('discordLogin');
  const logoutBtnAuth = document.getElementById('logoutBtnAuth');
  const unauthorisedBox = document.getElementById('unauthorisedBox');
  const uidBox = document.getElementById('userUid');
  const nav = document.getElementById('managementNav');

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

  function renderNav() {
    if (!nav) return;

    nav.innerHTML = PAGES.map(item => `
      <a href="${esc(item.href)}" class="${item.key === page ? 'active' : ''}" data-management-key="${esc(item.key)}" data-permission-key="${esc(item.permission)}">
        <span class="ico">${item.icon}</span>
        <span>${esc(item.label)}</span>
        ${item.status ? `<span class="nav-status">${esc(item.status)}</span>` : ''}
      </a>
    `).join('');
  }

  renderNav();

  if (!configured) {
    if (loginBtn) loginBtn.disabled = true;
    show(authNotice, 'Supabase is not configured.', 'error');
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
      show(authNotice, 'Could not verify officer access.', 'error');
      return;
    }

    if (!isOfficer) {
      if (authText) authText.textContent = `Signed in as ${metaName(user)}, but this account is not authorised.`;
      if (unauthorisedBox) unauthorisedBox.hidden = false;
      if (uidBox) uidBox.textContent = user.id;
      return;
    }

    if (authView) authView.hidden = true;
    if (managementView) managementView.hidden = false;

    const identity = document.getElementById('officerIdentity');
    if (identity) identity.textContent = `Signed in as ${metaName(user)}.`;

    // Granular permissions are deliberately NOT faked client-side.
    // These page/permission keys are hooks for the future server-enforced
    // permission system. Current behaviour remains exactly as before:
    // any active authorised officer can access Guild Management.
    const detail = {
      ready: true,
      client,
      user,
      isOfficer: true,
      page,
      permissionKey,
      pages: PAGES
    };

    window.ODIT_MANAGEMENT = detail;
    window.dispatchEvent(new CustomEvent('odit:management-ready', { detail }));
  }

  client.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') location.reload();
  });

  boot();
})();