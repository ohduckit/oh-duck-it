(() => {
  const msg = document.getElementById('portalMessage');
  const appList = document.getElementById('appList');
  const detail = document.getElementById('detail');
  const statusFilter = document.getElementById('statusFilter');
  const refreshBtn = document.getElementById('refreshBtn');

  if (!msg || !appList || !detail || !statusFilter || !refreshBtn) return;

  let client, user;
  let applications = [];
  let officers = [];
  let selectedId = null;

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));
  const show = (el,text,kind='info') => {
    el.hidden = false;
    el.className = `notice ${kind}`;
    el.textContent = text;
  };
  const hide = el => { el.hidden = true; };
  const niceDate = v => v
    ? new Date(v).toLocaleString([], {dateStyle:'medium', timeStyle:'short'})
    : '—';
  const metaName = u =>
    u?.user_metadata?.full_name ||
    u?.user_metadata?.name ||
    u?.user_metadata?.preferred_username ||
    u?.email ||
    'Officer';
  const statusLabel = s => s === 'Reviewing' ? 'Under Review' : (s || 'New');

  refreshBtn.addEventListener('click', loadApplications);
  statusFilter.addEventListener('change', renderList);

  document.querySelectorAll('.stat-button').forEach(button =>
    button.addEventListener('click', () => {
      statusFilter.value = button.dataset.filter || '';
      renderList();
    })
  );

  async function loadOfficers() {
    const { data, error } = await client.rpc('list_active_officers');

    if (error) {
      show(msg, `Could not load officers: ${error.message}`, 'error');
      officers = [];
      return;
    }

    officers = data || [];
  }

  async function loadApplications() {
    hide(msg);
    appList.innerHTML = '<div style="padding:18px;color:#8f8679">Loading applications…</div>';

    const { data, error } = await client
      .from('applications')
      .select('*')
      .order('created_at', { ascending:false });

    if (error) {
      show(msg, error.message, 'error');
      appList.innerHTML = '';
      return;
    }

    applications = data || [];

    if (selectedId && !applications.some(a => a.id === selectedId)) {
      selectedId = null;
    }

    renderStats();
    renderList();

    if (selectedId) {
      await selectApplication(selectedId);
    } else {
      detail.innerHTML = '<div style="color:#8f8679">Select an application to review it.</div>';
    }
  }

  function renderStats() {
    const count = status => applications.filter(a => a.status === status).length;
    document.getElementById('statNew').textContent = count('New');
    document.getElementById('statReviewing').textContent = count('Reviewing');
    document.getElementById('statInterview').textContent = count('Interview');
    document.getElementById('statTrial').textContent = count('Trial');
    document.getElementById('statAccepted').textContent = count('Accepted');
    document.getElementById('statTotal').textContent = applications.length;
  }

  function renderList() {
    const filter = statusFilter.value;
    const list = filter
      ? applications.filter(a => a.status === filter)
      : applications;

    if (!list.length) {
      appList.innerHTML = '<div style="padding:18px;color:#8f8679">No applications match this filter.</div>';
      return;
    }

    appList.innerHTML = list.map(a => `
      <button class="app-item ${a.id === selectedId ? 'active' : ''}" data-id="${esc(a.id)}">
        <strong>${esc(a.character_name)} — ${esc(a.main_spec)} ${esc(a.class_name)}</strong>
        <small>${esc(a.realm)} • ${esc(a.role)} • ${niceDate(a.created_at)}</small>
        <div class="badges">
          <span class="badge ${String(a.status || 'new').toLowerCase()}">${esc(statusLabel(a.status))}</span>
          ${a.assigned_name ? `<span class="badge">${esc(a.assigned_name)}</span>` : ''}
        </div>
      </button>
    `).join('');

    appList.querySelectorAll('.app-item').forEach(button =>
      button.addEventListener('click', () => selectApplication(button.dataset.id))
    );
  }

  const dataBox = (label,value,full=false) =>
    `<div class="data ${full ? 'full' : ''}"><span>${esc(label)}</span><p>${value ? esc(value) : '—'}</p></div>`;

  const linkBox = (label,url) =>
    `<div class="data"><span>${esc(label)}</span>${
      url
        ? `<p><a href="${esc(url)}" target="_blank" rel="noopener">Open profile ↗</a></p>`
        : '<p>—</p>'
    }</div>`;

  async function selectApplication(id) {
    selectedId = id;
    renderList();

    const a = applications.find(x => x.id === id);
    if (!a) return;

    detail.innerHTML = `
      <div class="eyebrow">Application</div>
      <h2>${esc(a.character_name)} — ${esc(a.main_spec)} ${esc(a.class_name)}</h2>
      <div class="badges">
        <span class="badge ${String(a.status || 'new').toLowerCase()}">${esc(statusLabel(a.status))}</span>
        <span class="badge">${esc(a.role)}</span>
        <span class="badge">${esc(a.region)} • ${esc(a.realm)}</span>
      </div>

      <div class="application-workflow">
        <div class="workflow-field">
          <label for="statusSelect">Application status</label>
          <select id="statusSelect" class="status-select">
            ${[
              ['New','New'],
              ['Reviewing','Under Review'],
              ['Interview','Interview'],
              ['Trial','Trial'],
              ['Accepted','Accepted'],
              ['Declined','Declined'],
              ['Archived','Archived']
            ].map(([value,label]) =>
              `<option value="${value}" ${value === a.status ? 'selected' : ''}>${label}</option>`
            ).join('')}
          </select>
        </div>
        <button id="saveStatus" class="btn primary" type="button">Update status</button>

        <div class="workflow-field">
          <label for="assigneeSelect">Assigned officer</label>
          <select id="assigneeSelect" class="status-select">
            <option value="">Unassigned</option>
            ${officers.map(o =>
              `<option value="${esc(o.user_id)}" ${o.user_id === a.assigned_to ? 'selected' : ''}>${esc(o.display_name)}</option>`
            ).join('')}
          </select>
        </div>
        <button id="saveAssignment" class="btn" type="button">Save assignment</button>
      </div>

      <div class="detail-grid">
        ${dataBox('Item level',a.item_level)}
        ${dataBox('Off-spec(s)',a.off_specs)}
        ${dataBox('Current progression',a.current_progression)}
        ${dataBox('Submitted',niceDate(a.created_at))}
        ${linkBox('Raider.IO',a.raiderio_url)}
        ${linkBox('Warcraft Logs',a.wcl_url)}
        ${linkBox('Armory',a.armory_url)}
        ${dataBox('Assigned officer',a.assigned_name)}
        ${dataBox('Wednesday',a.available_wed ? 'Available' : 'Not marked available')}
        ${dataBox('Thursday',a.available_thu ? 'Available' : 'Not marked available')}
        ${dataBox('Discord',a.discord_contact)}
        ${dataBox('Battle.net',a.battle_tag)}
        ${dataBox('Raid experience',a.raid_experience,true)}
        ${dataBox('Mythic+ experience',a.mplus_experience,true)}
        ${dataBox('Attendance notes',a.attendance_notes,true)}
        ${dataBox('Why ODit?',a.why_odit,true)}
        ${dataBox('Anything else',a.about_you,true)}
      </div>

      <div style="margin-top:18px">
        <h3 style="font-family:Georgia,serif">Officer notes</h3>
        <div id="notesList">Loading notes…</div>
        <div class="field">
          <label for="newNote">Add private note</label>
          <textarea id="newNote" maxlength="2000" placeholder="Visible only to authorised officers"></textarea>
        </div>
        <div class="actions" style="justify-content:flex-start">
          <button id="addNote" class="btn primary" type="button">Add note</button>
        </div>
      </div>

      <div class="danger-zone">
        <div>
          <strong>Delete application</strong>
          <p>Permanently removes this application and its officer notes. Use Archive if you only want it out of the active workflow.</p>
        </div>
        <button id="deleteApplication" class="btn danger" type="button">Delete application</button>
      </div>
    `;

    document.getElementById('saveStatus')?.addEventListener('click', saveStatus);
    document.getElementById('saveAssignment')?.addEventListener('click', saveAssignment);
    document.getElementById('addNote')?.addEventListener('click', addNote);
    document.getElementById('deleteApplication')?.addEventListener('click', deleteApplication);

    await loadNotes();
  }

  async function saveStatus() {
    const status = document.getElementById('statusSelect').value;
    const { error } = await client
      .from('applications')
      .update({ status })
      .eq('id', selectedId);

    if (error) {
      show(msg, error.message, 'error');
      return;
    }

    show(msg, `Application moved to ${statusLabel(status)}.`, 'success');
    await loadApplications();
  }

  async function saveAssignment() {
    const officerId = document.getElementById('assigneeSelect').value;
    const officer = officers.find(o => o.user_id === officerId);

    const update = officer
      ? {
          assigned_to: officer.user_id,
          assigned_name: officer.display_name,
          assigned_discord_user_id: officer.discord_user_id || null,
          assigned_by_name: metaName(user)
        }
      : {
          assigned_to: null,
          assigned_name: null,
          assigned_discord_user_id: null,
          assigned_by_name: metaName(user)
        };

    const { error } = await client
      .from('applications')
      .update(update)
      .eq('id', selectedId);

    if (error) {
      show(msg, error.message, 'error');
      return;
    }

    show(
      msg,
      officer ? `Application assigned to ${officer.display_name}.` : 'Application is now unassigned.',
      'success'
    );

    await loadApplications();
  }

  async function loadNotes() {
    const notes = document.getElementById('notesList');
    if (!notes) return;

    const { data, error } = await client
      .from('application_notes')
      .select('*')
      .eq('application_id', selectedId)
      .order('created_at', { ascending:true });

    if (error) {
      notes.innerHTML = `<div class="notice error">${esc(error.message)}</div>`;
      return;
    }

    if (!data?.length) {
      notes.innerHTML = '<p class="help">No officer notes yet.</p>';
      return;
    }

    notes.innerHTML = data.map(note => `
      <div class="note-entry">
        <strong>${esc(note.author_name || 'Officer')}</strong>
        <small>• ${niceDate(note.created_at)}</small>
        <div>${esc(note.body).replace(/\n/g,'<br>')}</div>
      </div>
    `).join('');
  }

  async function addNote() {
    const el = document.getElementById('newNote');
    const body = el.value.trim();
    if (!body) return;

    const { error } = await client
      .from('application_notes')
      .insert({
        application_id:selectedId,
        author_id:user.id,
        author_name:metaName(user),
        body
      });

    if (error) {
      show(msg, error.message, 'error');
      return;
    }

    el.value = '';
    await loadNotes();
  }

  async function deleteApplication() {
    const a = applications.find(x => x.id === selectedId);
    if (!a) return;

    const ok = window.confirm(
      `Permanently delete ${a.character_name}'s application?\n\n` +
      'This also deletes all officer notes and cannot be undone.'
    );
    if (!ok) return;

    const { error } = await client
      .from('applications')
      .delete()
      .eq('id', selectedId);

    if (error) {
      show(msg, `Could not delete application: ${error.message}`, 'error');
      return;
    }

    selectedId = null;
    show(msg, `${a.character_name}'s application was permanently deleted.`, 'success');
    await loadApplications();
  }

  async function ready(detail) {
    client = detail.client;
    user = detail.user;
    await loadOfficers();
    await loadApplications();
  }

  if (window.ODIT_OFFICER?.ready) ready(window.ODIT_OFFICER);
  else window.addEventListener('odit:officer-ready', e => ready(e.detail), { once:true });
})();