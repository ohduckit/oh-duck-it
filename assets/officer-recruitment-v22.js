(() => {
  const cfg = window.ODIT_SUPABASE || {};
  if (!window.supabase || !cfg.url || !cfg.key) return;

  const appList = document.getElementById('appList');
  const detail = document.getElementById('detail');
  const portalMessage = document.getElementById('portalMessage');
  if (!appList || !detail) return;

  const client = window.supabase.createClient(cfg.url, cfg.key);
  let applicationMeta = new Map();
  let metaLoading = false;
  let selectedRequest = 0;
  let timer = null;
  let actionBusy = false;

  const esc = (s='') =>
    String(s).replace(/[&<>'"]/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    }[c]));

  const niceDate = (v) => v
    ? new Date(v).toLocaleString([], {dateStyle:'medium', timeStyle:'short'})
    : '—';

  function showPortal(text, kind='info') {
    if (!portalMessage) return;
    portalMessage.hidden = false;
    portalMessage.className = `notice ${kind}`;
    portalMessage.textContent = text;
  }

  function injectStyles() {
    if (document.getElementById('oditDiscordRecruitmentStyles')) return;

    const style = document.createElement('style');
    style.id = 'oditDiscordRecruitmentStyles';
    style.textContent = `
      .discord-recruitment-panel{
        margin:16px 0;
        padding:14px;
        border:1px solid #5b421f;
        border-radius:10px;
        background:#17100c;
      }
      .discord-recruitment-panel h3{
        margin:0 0 6px;
        font-family:Georgia,serif;
        color:#e6be61;
      }
      .discord-verified-line{
        display:flex;
        flex-wrap:wrap;
        gap:7px;
        align-items:center;
        margin:8px 0 12px;
      }
      .discord-pill{
        display:inline-block;
        padding:4px 8px;
        border:1px solid #4f7342;
        border-radius:999px;
        color:#cfe8c4;
        background:#172314;
        font-size:11px;
        font-weight:800;
      }
      .interview-grid{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin-top:12px;
      }
      .interview-grid .field.full{grid-column:1/-1}
      .discord-action-note{
        margin:8px 0 0;
        color:#b9aa93;
        font-size:12px;
        line-height:1.4;
      }
      .discord-warning{
        padding:10px;
        border:1px solid #8e5b2a;
        border-radius:8px;
        background:#281a0f;
        color:#e2c28e;
      }
      .interview-response-box{
        margin-top:10px;
        padding:10px;
        border:1px solid #5b421f;
        border-radius:8px;
        background:#21160f;
      }
      .interview-response-box.confirmed{border-color:#4f7342}
      .interview-response-box.reschedule{border-color:#9a6a2d}
      .interview-response-box p{margin:5px 0;color:#cdbda7;line-height:1.45}
      @media(max-width:760px){
        .interview-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  async function loadMeta() {
    if (metaLoading) return;
    metaLoading = true;

    const { data, error } = await client
      .from('applications')
      .select(`
        id, faction, profession_1, profession_2, interests,
        discord_user_id, discord_username, discord_global_name,
        discord_verified_at, discord_guild_joined, discord_role_state,
        discord_last_dm_at, discord_last_error,
        interview_at, interview_room, interview_channel_id,
        interview_scheduled_by, interview_message_sent_at,
        interview_response_status, interview_response_at, interview_response_message,
        interview_officer_notified_at, interview_officer_notification_error,
        assigned_name, assigned_discord_user_id,
        battlenet_active_spec, main_spec, status
      `);

    metaLoading = false;
    if (error || !data) return;

    applicationMeta = new Map(data.map(row => [String(row.id), row]));
    decorateList();
    decorateSelected();
  }

  function decorateList() {
    appList.querySelectorAll('.app-item[data-id]').forEach(button => {
      const meta = applicationMeta.get(String(button.dataset.id));
      if (!meta?.faction) return;

      const small = button.querySelector('small');
      if (!small) return;

      const parts = small.textContent.split(' • ');
      if (parts.length >= 3) {
        small.textContent = `${parts[0]} • ${meta.faction} • ${parts.slice(2).join(' • ')}`;
      }
    });
  }

  async function getSelectedMeta() {
    const active = appList.querySelector('.app-item.active[data-id]');
    if (!active) return null;

    const id = String(active.dataset.id);
    let meta = applicationMeta.get(id);

    if (meta) return { id, meta };

    const request = ++selectedRequest;
    const { data, error } = await client
      .from('applications')
      .select(`
        id, faction, profession_1, profession_2, interests,
        discord_user_id, discord_username, discord_global_name,
        discord_verified_at, discord_guild_joined, discord_role_state,
        discord_last_dm_at, discord_last_error,
        interview_at, interview_room, interview_channel_id,
        interview_scheduled_by, interview_message_sent_at,
        interview_response_status, interview_response_at, interview_response_message,
        interview_officer_notified_at, interview_officer_notification_error,
        assigned_name, assigned_discord_user_id,
        battlenet_active_spec, main_spec, status
      `)
      .eq('id', id)
      .maybeSingle();

    if (request !== selectedRequest || error || !data) return null;

    applicationMeta.set(id, data);
    return { id, meta:data };
  }

  async function decorateSelected() {
    const selected = await getSelectedMeta();
    const grid = detail.querySelector('.detail-grid');
    const workflow = detail.querySelector('.application-workflow');
    if (!selected || !grid || !workflow) return;

    const { id, meta } = selected;

    if (meta.faction) {
      const badges = detail.querySelectorAll('.badges .badge');
      if (badges.length >= 2) badges[1].textContent = meta.faction;
    }

    if (!grid.querySelector(`[data-recruitment-extra="${CSS.escape(id)}"]`)) {
      const professions = [meta.profession_1, meta.profession_2].filter(Boolean);
      const interests = Array.isArray(meta.interests) ? meta.interests : [];

      const block = document.createElement('div');
      block.dataset.recruitmentExtra = id;
      block.className = 'data full';
      block.innerHTML = `
        <span>Guild interests & professions</span>
        <p><b>Faction:</b> ${meta.faction ? esc(meta.faction) : '—'}<br>
        <b>Interests:</b> ${interests.length ? esc(interests.join(' • ')) : '—'}<br>
        <b>Professions:</b> ${professions.length ? esc(professions.join(' • ')) : '—'}<br>
        <b>Applying as:</b> ${meta.main_spec ? esc(meta.main_spec) : '—'}<br>
        <b>Battle.net active spec:</b> ${meta.battlenet_active_spec ? esc(meta.battlenet_active_spec) : '—'}</p>
      `;
      grid.prepend(block);
    }

    let panel = detail.querySelector(`[data-discord-workflow="${CSS.escape(id)}"]`);
    if (panel) return;

    panel = document.createElement('div');
    panel.dataset.discordWorkflow = id;
    panel.className = 'discord-recruitment-panel';

    if (!meta.discord_user_id) {
      panel.innerHTML = `
        <h3>Discord Recruitment</h3>
        <div class="discord-warning">
          This is a legacy application without Discord account verification.
          Automated interview messages and role changes are unavailable.
        </div>
      `;
      workflow.insertAdjacentElement('afterend', panel);
      return;
    }

    const display =
      meta.discord_global_name && meta.discord_username
        ? `${esc(meta.discord_global_name)} (@${esc(meta.discord_username)})`
        : `@${esc(meta.discord_username || 'verified-user')}`;

    const responseState = meta.interview_response_status || '';
    const responseClass = responseState === 'Confirmed'
      ? 'confirmed'
      : responseState === 'Reschedule requested'
        ? 'reschedule'
        : '';
    const responseBlock = meta.interview_at ? `
      <div class="interview-response-box ${responseClass}">
        <p><b>Applicant response:</b> ${esc(responseState || 'Awaiting response')}</p>
        ${meta.interview_response_at ? `<p><b>Response received:</b> ${esc(niceDate(meta.interview_response_at))}</p>` : ''}
        ${meta.interview_response_message ? `<p><b>Availability / message:</b> ${esc(meta.interview_response_message)}</p>` : ''}
        <p><b>Assigned officer notification:</b> ${meta.interview_officer_notified_at ? `Sent ${esc(niceDate(meta.interview_officer_notified_at))}` : 'Not confirmed'}</p>
        ${meta.interview_officer_notification_error ? `<p class="discord-warning">${esc(meta.interview_officer_notification_error)}</p>` : ''}
      </div>
    ` : '';

    const interviewPanel = meta.status === 'Interview' ? `
      <div class="interview-grid">
        <div class="field">
          <label for="interviewDateTime">Interview date & time</label>
          <input id="interviewDateTime" type="datetime-local">
        </div>
        <div class="field">
          <label for="interviewRoom">Interview room</label>
          <select id="interviewRoom">
            <option value="room1">Applicant chat room 1</option>
            <option value="room2">Applicant chat room 2</option>
          </select>
        </div>
        <div class="field full">
          <button id="scheduleDiscordInterview" class="btn primary" type="button">
            Schedule & send Discord interview
          </button>
          <p class="discord-action-note">
            The time is entered in your browser's local timezone. Discord will display it in the applicant's own local timezone.
          </p>
        </div>
      </div>
    ` : '';

    panel.innerHTML = `
      <h3>Discord Recruitment</h3>
      <div class="discord-verified-line">
        <span class="discord-pill">✓ Verified Discord</span>
        <strong>${display}</strong>
        <span class="badge">${esc(meta.discord_role_state || 'None')}</span>
      </div>
      ${meta.interview_at ? `
        <p class="discord-action-note">
          <b>Interview:</b> ${esc(niceDate(meta.interview_at))}<br>
          <b>Room:</b> ${esc(meta.interview_room || '—')}<br>
          <b>Scheduled by:</b> ${esc(meta.interview_scheduled_by || '—')}<br>
          <b>Discord message:</b> ${meta.interview_message_sent_at ? `Sent ${esc(niceDate(meta.interview_message_sent_at))}` : 'Not delivered'}
        </p>
      ` : ''}
      ${responseBlock}
      ${meta.discord_last_error ? `
        <div class="notice error" style="margin-top:10px">${esc(meta.discord_last_error)}</div>
      ` : ''}
      ${interviewPanel}
      <p class="discord-action-note">
        A verified applicant has no ODit server access while New or Reviewing. Moving them to <b>Interview</b>, <b>Trial</b> or <b>Accepted</b> will add them to the server if needed and apply the appropriate managed role.
      </p>
    `;

    workflow.insertAdjacentElement('afterend', panel);

    const scheduleBtn = panel.querySelector('#scheduleDiscordInterview');
    scheduleBtn?.addEventListener('click', () => scheduleInterview(id));
  }

  async function invokeDiscord(action, body={}) {
    const { data, error } = await client.functions.invoke('discord-recruitment', {
      body: { action, ...body }
    });

    if (error || !data?.ok) {
      console.error(error || data);
      let message = data?.message || '';

      if (!message) {
        try {
          const context = error?.context;
          if (context && typeof context.clone === 'function') {
            const payload = await context.clone().json();
            message = payload?.message || '';
          }
        } catch {}
      }

      throw new Error(message || error?.message || 'Discord recruitment action failed.');
    }

    return data;
  }

  async function scheduleInterview(applicationId) {
    if (actionBusy) return;

    const dateValue = document.getElementById('interviewDateTime')?.value || '';
    const roomKey = document.getElementById('interviewRoom')?.value || '';

    if (!dateValue || !roomKey) {
      showPortal('Choose an interview date/time and room first.', 'error');
      return;
    }

    const date = new Date(dateValue);
    if (!Number.isFinite(date.getTime())) {
      showPortal('Choose a valid interview date and time.', 'error');
      return;
    }

    actionBusy = true;
    try {
      const result = await invokeDiscord('schedule_interview', {
        application_id: applicationId,
        interview_at: date.toISOString(),
        room_key: roomKey
      });

      showPortal(
        result.message || 'Recruitment chat sent.',
        result.dm_sent ? 'success' : 'error'
      );

      applicationMeta.clear();
      document.getElementById('refreshBtn')?.click();
    } catch (err) {
      showPortal(err.message, 'error');
    } finally {
      actionBusy = false;
    }
  }

  async function transitionStatus(applicationId, status) {
    if (actionBusy) return;

    const confirmations = {
      Interview:
        'Move this applicant to Interview?\n\nThis will add their verified Discord account to ODit if needed and grant Applicant access. You can then schedule the interview message.',
      Trial:
        'Move this applicant to Trial?\n\nThis will add them to ODit if needed, switch them to the Trial Discord role and send a Discord message.',
      Accepted:
        'Accept this applicant as a Raider?\n\nThis will remove recruitment roles, add the Raider Discord role and send a welcome message.',
      Declined:
        'Decline this application?\n\nApplicant and Trial Discord access will be removed.'
    };

    if (confirmations[status] && !window.confirm(confirmations[status])) {
      return;
    }

    actionBusy = true;
    try {
      const result = await invokeDiscord('transition_status', {
        application_id: applicationId,
        status
      });

      const kind =
        result.dm_sent === false && ['Trial','Accepted'].includes(status)
          ? 'error'
          : 'success';

      showPortal(result.message || `Application moved to ${status}.`, kind);
      applicationMeta.clear();
      document.getElementById('refreshBtn')?.click();
    } catch (err) {
      showPortal(err.message, 'error');
    } finally {
      actionBusy = false;
    }
  }

  // Capture the existing Officer Portal "Update status" click before
  // officers.js handles it. Verified Discord applications use the server-side
  // transition endpoint; legacy applications continue to use the old behaviour.
  document.addEventListener('click', async event => {
    const button = event.target.closest?.('#saveStatus');
    if (!button) return;

    const selected = await getSelectedMeta();
    if (!selected?.meta?.discord_user_id) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const status = document.getElementById('statusSelect')?.value || '';
    await transitionStatus(selected.id, status);
  }, true);

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      decorateList();
      decorateSelected();
    }, 25);
  }

  injectStyles();

  const listObserver = new MutationObserver(schedule);
  listObserver.observe(appList, {
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:['class']
  });

  const detailObserver = new MutationObserver(schedule);
  detailObserver.observe(detail, { subtree:true, childList:true });

  appList.addEventListener('click', schedule);

  loadMeta();
})();
