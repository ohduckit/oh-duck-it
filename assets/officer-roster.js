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

  const ROLE_ORDER = ['Tank','Healer','Melee DPS','Ranged DPS','Flexible'];

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

  function rowSort(a, b) {
    const roleA = ROLE_ORDER.indexOf(a.raid_role);
    const roleB = ROLE_ORDER.indexOf(b.raid_role);

    return (roleA === -1 ? 999 : roleA) - (roleB === -1 ? 999 : roleB) ||
      Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
      String(a.player_name || '').localeCompare(String(b.player_name || ''));
  }

  function hydrateRows() {
    rows = members.map(member => {
      const character =
        characters.find(c => c.member_id === member.id && c.is_raid_character) ||
        characters.find(c => c.member_id === member.id) ||
        null;
      return { ...member, character };
    }).sort(rowSort);
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
    }).sort(rowSort);
  }

  function renderRow(row) {
    const ch = row.character || {};
    const image = ch.avatar_url || iconFor(ch.class_name, ch.spec_name);
    const classColor = CLASS_COLORS[ch.class_name] || '#b88635';

    return `
      <article class="officer-roster-row" data-member-id="${esc(row.id)}" style="--class-color:${esc(classColor)}">
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
          <button class="btn roster-move-up" type="button" data-id="${esc(row.id)}" title="Move up within ${esc(row.raid_role)}">↑</button>
          <button class="btn roster-move-down" type="button" data-id="${esc(row.id)}" title="Move down within ${esc(row.raid_role)}">↓</button>
          <button class="btn roster-edit" type="button" data-id="${esc(row.id)}">Edit</button>
        </div>
      </article>
    `;
  }

  function renderRoleSection(role, roleRows) {
    const coreCount = roleRows.filter(row => row.raid_status === 'core').length;
    const trialCount = roleRows.filter(row => row.raid_status === 'trial').length;
    const reserveCount = roleRows.filter(row => row.raid_status === 'reserve').length;

    const summaryBits = [`${roleRows.length} member${roleRows.length === 1 ? '' : 's'}`];
    if (coreCount) summaryBits.push(`${coreCount} core`);
    if (trialCount) summaryBits.push(`${trialCount} trial`);
    if (reserveCount) summaryBits.push(`${reserveCount} reserve`);

    return `
      <section class="officer-roster-group" data-role="${esc(role)}">
        <div class="officer-roster-group-head">
          <h3>${esc(role)}</h3>
          <span class="officer-roster-group-meta">${esc(summaryBits.join(' • '))}</span>
        </div>
        <div class="officer-roster-group-list">
          ${roleRows.map(renderRow).join('')}
        </div>
      </section>
    `;
  }

  function renderList() {
    const filtered = filteredRows();

    if (!filtered.length) {
      list.innerHTML = '<div class="roster-empty">No roster members match this filter.</div>';
      return;
    }

    const groupedMarkup = ROLE_ORDER
      .map(role => {
        const roleRows = filtered.filter(row => row.raid_role === role);
        if (!roleRows.length) return '';
        return renderRoleSection(role, roleRows);
      })
      .filter(Boolean)
      .join('');

    const otherRows = filtered.filter(row => !ROLE_ORDER.includes(row.raid_role));
    const otherMarkup = otherRows.length ? renderRoleSection('Other', otherRows) : '';

    list.innerHTML = groupedMarkup + otherMarkup;

    list.querySelectorAll('.roster-edit').forEach(button => {
      button.addEventListener('click', () => openEditor(button.dataset.id));
    });

    list.querySelectorAll('.roster-move-up').forEach(button => {
      button.addEventListener('click', () => moveMember(button.dataset.id, -1));
    });

    list.querySelectorAll('.roster-move-down').forEach(button => {
      button.addEventListener('click', () => moveMember(button.dataset.id, 1));
    });

    updateMoveButtonState();
  }

  function updateMoveButtonState() {
    const searchActive = Boolean(String(document.getElementById('rosterSearch').value || '').trim());
    const statusActive = Boolean(document.getElementById('rosterStatusFilter').value);
    const roleActive = Boolean(document.getElementById('rosterRoleFilter').value);
    const filtered = searchActive || statusActive || roleActive;

    list.querySelectorAll('.roster-move-up,.roster-move-down').forEach(button => {
      button.disabled = filtered;
      if (filtered) {
        button.title = 'Clear roster filters before reordering.';
      }
    });

    if (filtered) return;

    for (const role of ROLE_ORDER) {
      const roleRows = rows.filter(row => row.raid_role === role).sort(rowSort);

      roleRows.forEach((row, index) => {
        const article = list.querySelector(`.officer-roster-row[data-member-id="${CSS.escape(row.id)}"]`);
        if (!article) return;

        const up = article.querySelector('.roster-move-up');
        const down = article.querySelector('.roster-move-down');

        if (up) up.disabled = index === 0;
        if (down) down.disabled = index === roleRows.length - 1;
      });
    }
  }

  async function moveMember(memberId, direction) {
    hideMessage();

    const row = rows.find(item => item.id === memberId);
    if (!row) return;

    const roleRows = rows
      .filter(item => item.raid_role === row.raid_role)
      .sort(rowSort);

    const index = roleRows.findIndex(item => item.id === memberId);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= roleRows.length) return;

    const target = roleRows[targetIndex];
    const currentOrder = Number(row.sort_order || 0);
    const targetOrder = Number(target.sort_order || 0);

    // If legacy data happens to contain matching sort values, create deterministic
    // temporary positions before normalising both rows.
    const rowOrder = currentOrder === targetOrder ? (index + 1) * 10 : currentOrder;
    const swapOrder = currentOrder === targetOrder ? (targetIndex + 1) * 10 : targetOrder;

    const buttons = list.querySelectorAll('.roster-move-up,.roster-move-down');
    buttons.forEach(button => button.disabled = true);

    try {
      const { error:firstError } = await client
        .from('raid_roster_members')
        .update({ sort_order: swapOrder })
        .eq('id', row.id);

      if (firstError) throw firstError;

      const { error:secondError } = await client
        .from('raid_roster_members')
        .update({ sort_order: rowOrder })
        .eq('id', target.id);

      if (secondError) throw secondError;

      await load();
    } catch (error) {
      show(`Could not reorder roster: ${error?.message || error}`, 'error');
      await load();
    }
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

  function nextSortOrder(role, excludeMemberId='') {
    const roleRows = rows
      .filter(item => item.raid_role === role && item.id !== excludeMemberId)
      .sort(rowSort);

    if (!roleRows.length) return 10;

    return Math.max(...roleRows.map(item => Number(item.sort_order || 0))) + 10;
  }

  async function save(event) {
    event.preventDefault();
    hideMessage();

    const memberId = document.getElementById('rosterMemberId').value;
    const characterId = document.getElementById('rosterCharacterId').value;

    const selectedRole = document.getElementById('rosterRole').value;
    const existingRow = memberId ? rows.find(item => item.id === memberId) : null;
    const roleChanged = Boolean(existingRow && existingRow.raid_role !== selectedRole);

    const memberPayload = {
      player_name: document.getElementById('rosterPlayerName').value.trim(),
      raid_status: document.getElementById('rosterStatus').value,
      raid_role: selectedRole,
      public_visible: document.getElementById('rosterPublicVisible').checked,
      sort_order: existingRow && !roleChanged
        ? Number(existingRow.sort_order || 10)
        : nextSortOrder(selectedRole, memberId),
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
