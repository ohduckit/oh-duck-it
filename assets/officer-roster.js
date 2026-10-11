(() => {
  const list = document.getElementById('officerRosterList');
  if (!list) return;

  let client;
  let members = [];
  let characters = [];
  let rows = [];

  const specData = window.ODIT_RECRUITMENT_SPEC_DATA || { classes:[] };
  const CLASS_COLORS = Object.fromEntries((specData.classes || []).map(cls => [cls.name, cls.color]));
  const STATUS_LABEL = {
    core:'Core', trial:'Trial', reserve:'Reserve',
    inactive:'Inactive', not_raiding:'Not raiding'
  };

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const message = document.getElementById('rosterMessage');
  const dialog = document.getElementById('rosterDialog');
  const form = document.getElementById('rosterForm');

  function show(text, kind='info') {
    message.hidden = false;
    message.className = `notice ${kind}`;
    message.textContent = text;
  }

  function hideMessage() { message.hidden = true; }

  function iconFor(className, specName) {
    const cls = specData.classes.find(c => c.name === className);
    return cls?.specs?.find(s => s.name === specName)?.icon || '';
  }

  function nullableNumber(value) {
    const s = String(value ?? '').trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function hydrateRows() {
    rows = members.map(member => {
      const character =
        characters.find(c => c.member_id === member.id && c.is_raid_character) ||
        characters.find(c => c.member_id === member.id) ||
        null;
      return { ...member, character };
    });
  }

  function renderStats() {
    const box = document.getElementById('officerRosterStats');
    const visible = rows.filter(r => ['core','trial','reserve'].includes(r.raid_status));
    const count = status => rows.filter(r => r.raid_status === status).length;
    const role = name => visible.filter(r => r.raid_role === name).length;

    box.innerHTML = `
      <div class="roster-overview-stat"><span>Active roster</span><b>${visible.length}</b></div>
      <div class="roster-overview-stat"><span>Core</span><b>${count('core')}</b></div>
      <div class="roster-overview-stat"><span>Trials</span><b>${count('trial')}</b></div>
      <div class="roster-overview-stat"><span>Tanks / Healers</span><b>${role('Tank')} / ${role('Healer')}</b></div>
      <div class="roster-overview-stat"><span>Melee / Ranged</span><b>${role('Melee DPS')} / ${role('Ranged DPS')}</b></div>
    `;
  }

  function filteredRows() {
    const search = String(document.getElementById('rosterSearch').value || '').trim().toLowerCase();
    const status = document.getElementById('rosterStatusFilter').value;
    const role = document.getElementById('rosterRoleFilter').value;

    return rows.filter(row => {
      const ch = row.character || {};
      const haystack = `${row.player_name} ${ch.character_name || ''} ${ch.class_name || ''} ${ch.spec_name || ''}`.toLowerCase();
      return (!search || haystack.includes(search)) &&
        (!status || row.raid_status === status) &&
        (!role || row.raid_role === role);
    });
  }

  function renderList() {
    const filtered = filteredRows();

    if (!filtered.length) {
      list.innerHTML = '<div class="roster-empty">No roster members match this filter.</div>';
      return;
    }

    list.innerHTML = filtered.map(row => {
      const ch = row.character || {};
      const image = ch.avatar_url || iconFor(ch.class_name, ch.spec_name);
      const classColor = CLASS_COLORS[ch.class_name] || '#b88635';

      return `
        <article class="officer-roster-row" style="--class-color:${esc(classColor)}">
          ${image ? `<img src="${esc(image)}" alt="">` : '<div></div>'}
          <div>
            <b>${esc(row.player_name)}</b>
            <small>${esc(ch.character_name || 'No raid character')} • ${esc(ch.spec_name || '')} ${esc(ch.class_name || '')}</small>
          </div>
          <div class="officer-roster-cell officer-roster-role">${esc(row.raid_role)}</div>
          <div class="officer-roster-cell officer-roster-status">
            <span class="roster-status ${esc(row.raid_status)}">${esc(STATUS_LABEL[row.raid_status] || row.raid_status)}</span>
          </div>
          <div class="officer-roster-cell officer-roster-ilvl">
            ${Number(ch.item_level) > 0 ? `${Number(ch.item_level).toFixed(1)} ilvl` : '—'}
          </div>
          <div class="officer-roster-actions">
            <button class="btn roster-edit" type="button" data-id="${esc(row.id)}">Edit</button>
          </div>
        </article>
      `;
    }).join('');

    list.querySelectorAll('.roster-edit').forEach(button => {
      button.addEventListener('click', () => openEditor(button.dataset.id));
    });
  }

  async function load() {
    hideMessage();

    const [
      { data: memberData, error: memberError },
      { data: characterData, error: characterError }
    ] = await Promise.all([
      client.from('raid_roster_members').select('*').order('sort_order').order('player_name'),
      client.from('raid_roster_characters').select('*')
    ]);

    if (memberError || characterError) {
      show(`Could not load roster: ${(memberError || characterError)?.message || 'unknown error'}`, 'error');
      return;
    }

    members = memberData || [];
    characters = characterData || [];
    hydrateRows();
    renderStats();
    renderList();
  }

  function populateClassOptions(selected='') {
    const select = document.getElementById('rosterClass');
    select.innerHTML = (specData.classes || []).map(cls =>
      `<option value="${esc(cls.name)}" ${cls.name === selected ? 'selected' : ''}>${esc(cls.name)}</option>`
    ).join('');
  }

  function populateSpecOptions(className, selected='') {
    const select = document.getElementById('rosterSpec');
    const cls = specData.classes.find(c => c.name === className);
    select.innerHTML = (cls?.specs || []).map(spec =>
      `<option value="${esc(spec.name)}" ${spec.name === selected ? 'selected' : ''}>${esc(spec.name)}</option>`
    ).join('');
  }

  function setField(id, value='') {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
  }

  function openEditor(memberId='') {
    hideMessage();

    const row = memberId ? rows.find(r => r.id === memberId) : null;
    const ch = row?.character || {};

    document.getElementById('rosterDialogTitle').textContent = row ? `Edit ${row.player_name}` : 'Add member';
    setField('rosterMemberId', row?.id || '');
    setField('rosterCharacterId', ch.id || '');
    setField('rosterPlayerName', row?.player_name || '');
    setField('rosterCharacterName', ch.character_name || '');
    setField('rosterStatus', row?.raid_status || 'core');
    setField('rosterRole', row?.raid_role || 'Melee DPS');

    populateClassOptions(ch.class_name || 'Paladin');
    populateSpecOptions(document.getElementById('rosterClass').value, ch.spec_name || '');

    setField('rosterRace', ch.race_name || '');
    setField('rosterRealm', ch.realm || '');
    setField('rosterRegion', ch.region || 'EU');
    setField('rosterSortOrder', row?.sort_order ?? 100);
    setField('rosterLevel', ch.level ?? '');
    setField('rosterItemLevel', ch.item_level ?? '');
    setField('rosterMplusScore', ch.mplus_score ?? '');
    setField('rosterAvatarUrl', ch.avatar_url || '');
    setField('rosterRaiderIoUrl', ch.raiderio_url || '');
    setField('rosterArmoryUrl', ch.armory_url || '');
    setField('rosterOfficerNote', row?.officer_note || '');

    document.getElementById('rosterPublicVisible').checked = row?.public_visible !== false;
    document.getElementById('deleteRosterMember').hidden = !row;

    dialog.showModal();
  }

  async function save(event) {
    event.preventDefault();
    hideMessage();

    const memberId = document.getElementById('rosterMemberId').value;
    const characterId = document.getElementById('rosterCharacterId').value;

    const memberPayload = {
      player_name: document.getElementById('rosterPlayerName').value.trim(),
      raid_status: document.getElementById('rosterStatus').value,
      raid_role: document.getElementById('rosterRole').value,
      public_visible: document.getElementById('rosterPublicVisible').checked,
      sort_order: Number(document.getElementById('rosterSortOrder').value || 100),
      officer_note: document.getElementById('rosterOfficerNote').value.trim() || null
    };

    const characterPayload = {
      character_name: document.getElementById('rosterCharacterName').value.trim(),
      region: document.getElementById('rosterRegion').value,
      realm: document.getElementById('rosterRealm').value.trim() || null,
      race_name: document.getElementById('rosterRace').value.trim() || null,
      class_name: document.getElementById('rosterClass').value,
      spec_name: document.getElementById('rosterSpec').value,
      level: nullableNumber(document.getElementById('rosterLevel').value),
      item_level: nullableNumber(document.getElementById('rosterItemLevel').value),
      mplus_score: nullableNumber(document.getElementById('rosterMplusScore').value),
      avatar_url: document.getElementById('rosterAvatarUrl').value.trim() || null,
      raiderio_url: document.getElementById('rosterRaiderIoUrl').value.trim() || null,
      armory_url: document.getElementById('rosterArmoryUrl').value.trim() || null,
      is_main: true,
      is_raid_character: true
    };

    if (!memberPayload.player_name || !characterPayload.character_name) {
      show('Player name and raid character are required.', 'error');
      return;
    }

    const saveBtn = document.getElementById('saveRosterMember');
    saveBtn.disabled = true;

    try {
      let savedMemberId = memberId;

      if (memberId) {
        const { error } = await client.from('raid_roster_members').update(memberPayload).eq('id', memberId);
        if (error) throw error;
      } else {
        const { data, error } = await client.from('raid_roster_members').insert(memberPayload).select('id').single();
        if (error) throw error;
        savedMemberId = data.id;
      }

      characterPayload.member_id = savedMemberId;

      if (characterId) {
        const { error } = await client.from('raid_roster_characters').update(characterPayload).eq('id', characterId);
        if (error) throw error;
      } else {
        const { error } = await client.from('raid_roster_characters').insert(characterPayload);
        if (error) throw error;
      }

      dialog.close();
      show('Roster member saved.', 'success');
      await load();
    } catch (error) {
      show(`Could not save roster member: ${error?.message || error}`, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function removeMember() {
    const memberId = document.getElementById('rosterMemberId').value;
    const player = document.getElementById('rosterPlayerName').value.trim();
    if (!memberId) return;
    if (!window.confirm(`Delete ${player} from the raid roster?`)) return;

    const { error } = await client.from('raid_roster_members').delete().eq('id', memberId);
    if (error) {
      show(`Could not delete roster member: ${error.message}`, 'error');
      return;
    }

    dialog.close();
    show(`${player} removed from the raid roster.`, 'success');
    await load();
  }

  async function syncRoster() {
    const button = document.getElementById('rosterSyncBtn');
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Syncing…';

    try {
      const { data:{ session } } = await client.auth.getSession();
      if (!session?.access_token) throw new Error('Officer session is not available.');

      const response = await fetch(`${window.ODIT_SUPABASE.url}/functions/v1/roster-sync`, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'apikey':window.ODIT_SUPABASE.key,
          'Authorization':`Bearer ${session.access_token}`
        },
        body:'{}'
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok !== true) {
        throw new Error(result?.message || `Roster sync failed (${response.status}).`);
      }

      const extra = result.skipped?.length
        ? ` ${result.skipped.length} skipped because a realm is not set.`
        : '';

      show(`${result.message || 'Roster synced.'}${extra}`, result.failed?.length ? 'info' : 'success');
      await load();
    } catch (error) {
      show(`Could not sync roster: ${error?.message || error}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  document.getElementById('addRosterMember').addEventListener('click', () => openEditor());
  document.getElementById('rosterRefreshBtn').addEventListener('click', load);
  document.getElementById('rosterSearch').addEventListener('input', renderList);
  document.getElementById('rosterStatusFilter').addEventListener('change', renderList);
  document.getElementById('rosterRoleFilter').addEventListener('change', renderList);
  document.getElementById('rosterDialogClose').addEventListener('click', () => dialog.close());
  document.getElementById('cancelRosterMember').addEventListener('click', () => dialog.close());
  document.getElementById('deleteRosterMember').addEventListener('click', removeMember);
  document.getElementById('rosterSyncBtn').addEventListener('click', syncRoster);
  document.getElementById('rosterClass').addEventListener('change', event => populateSpecOptions(event.target.value));
  form.addEventListener('submit', save);

  function ready(detail) {
    client = detail.client;
    populateClassOptions();
    populateSpecOptions(document.getElementById('rosterClass').value);
    load();
  }

  if (window.ODIT_OFFICER?.ready) ready(window.ODIT_OFFICER);
  else window.addEventListener('odit:officer-ready', event => ready(event.detail), { once:true });
})();
