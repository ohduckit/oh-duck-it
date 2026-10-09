(() => {
  const cfg = window.ODIT_SUPABASE || {};
  if (!window.supabase || !cfg.url || !cfg.key) return;

  const managementView = document.getElementById('managementView');
  const rolesSection = document.getElementById('roles');
  const sideNav = managementView?.querySelector('.side-nav');
  if (!managementView || !rolesSection || !sideNav) return;

  const client = window.supabase.createClient(cfg.url, cfg.key);
  let officers = [];
  let loaded = false;

  const RULES = [
    ['tank-lead', 'Tank Lead', 'New tank applications'],
    ['healer-lead', 'Healer Lead', 'New healer applications'],
    ['melee-dps-lead', 'Melee DPS Lead', 'New melee DPS applications'],
    ['ranged-dps-lead', 'Ranged DPS Lead', 'New ranged DPS applications'],
    ['raid-leader', 'Raid Lead', 'Takes ownership when an applicant moves to Trial'],
    ['recruit-lead', 'Recruitment & Roster Lead', 'Fallback if the relevant role lead is vacant'],
  ];

  function esc(value='') {
    return String(value).replace(/[&<>'"]/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    }[c]));
  }

  function show(el, text, kind='info') {
    el.hidden = false;
    el.className = `notice ${kind}`;
    el.textContent = text;
  }

  function buildUi() {
    if (document.getElementById('recruitment-ownership')) return;

    const nav = document.createElement('a');
    nav.href = '#recruitment-ownership';
    nav.innerHTML = '<span class="ico">♟</span><span>Recruitment Ownership</span><span class="nav-status">Live</span>';
    const progressionLink = sideNav.querySelector('a[href="#progression"]');
    if (progressionLink) sideNav.insertBefore(nav, progressionLink);
    else sideNav.appendChild(nav);

    const section = document.createElement('section');
    section.className = 'card structure-admin anchor-section';
    section.id = 'recruitment-ownership';
    section.innerHTML = `
      <h2>Recruitment Ownership</h2>
      <p class="help">
        New applications are assigned automatically from their verified gameplay role.
        New, Under Review and Interview remain with the relevant role lead. When an
        applicant moves to <b>Trial</b>, ownership automatically passes to the
        <b>Raid Lead</b> for the final assessment and decision.
      </p>
      <div id="recruitmentOwnershipMessage" class="notice" style="margin:14px 0" hidden></div>
      <div class="form-grid structure-fields" id="recruitmentOwnershipFields">
        ${RULES.map(([key,label,help]) => `
          <div class="field">
            <label for="recruit-owner-${esc(key)}">${esc(label)}</label>
            <select id="recruit-owner-${esc(key)}" data-recruit-owner="${esc(key)}">
              <option value="">Unassigned</option>
            </select>
            <span class="field-help">${esc(help)}</span>
          </div>
        `).join('')}
      </div>
      <div class="actions" style="justify-content:flex-start">
        <button id="saveRecruitmentOwnership" class="btn primary" type="button">Save recruitment ownership</button>
      </div>
    `;

    rolesSection.insertAdjacentElement('afterend', section);
    section.querySelector('#saveRecruitmentOwnership')?.addEventListener('click', save);
  }

  async function load() {
    buildUi();
    const message = document.getElementById('recruitmentOwnershipMessage');
    if (!message) return;

    const { data:{ session } } = await client.auth.getSession();
    if (!session?.user) return;

    const { data:isOfficer, error:officerCheckError } = await client.rpc('is_officer');
    if (officerCheckError || !isOfficer) return;

    const [{ data: officerRows, error: officerError }, { data: rules, error: rulesError }] = await Promise.all([
      client.rpc('list_active_officers'),
      client.from('recruitment_assignment_rules').select('role_key,officer_user_id,updated_at'),
    ]);

    if (officerError) {
      show(message, `Could not load active officers: ${officerError.message}`, 'error');
      return;
    }
    if (rulesError) {
      show(message, 'Recruitment ownership is not available yet. Run the Recruitment Auto Assignment v2.2 SQL migration first.', 'error');
      return;
    }

    officers = officerRows || [];
    const byRole = new Map((rules || []).map(row => [row.role_key, row.officer_user_id || '']));

    document.querySelectorAll('[data-recruit-owner]').forEach(select => {
      const current = byRole.get(select.dataset.recruitOwner) || '';
      select.innerHTML = '<option value="">Unassigned</option>' + officers.map(o =>
        `<option value="${esc(o.user_id)}" ${o.user_id===current?'selected':''}>${esc(o.display_name)}</option>`
      ).join('');
    });

    loaded = true;
  }

  async function save() {
    if (!loaded) return;
    const message = document.getElementById('recruitmentOwnershipMessage');
    const button = document.getElementById('saveRecruitmentOwnership');
    if (!message || !button) return;

    button.disabled = true;
    try {
      for (const select of document.querySelectorAll('[data-recruit-owner]')) {
        const officerId = select.value || null;
        const { error } = await client
          .from('recruitment_assignment_rules')
          .update({ officer_user_id: officerId, updated_at: new Date().toISOString() })
          .eq('role_key', select.dataset.recruitOwner);
        if (error) throw error;
      }
      show(message, 'Recruitment ownership saved. New applications will now route automatically, and Trial will hand over to the Raid Lead.', 'success');
    } catch (err) {
      show(message, `Could not save recruitment ownership: ${err?.message || err}`, 'error');
    } finally {
      button.disabled = false;
    }
  }

  // Main Guild Management reveals the page only after officer auth. The add-on can
  // safely build immediately; data loading itself still checks the authenticated officer.
  load();
})();
