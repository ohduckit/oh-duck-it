(() => {
  const message = document.getElementById('structureMessage');
  const councilBox = document.getElementById('structureCouncil');
  const mentorsBox = document.getElementById('structureMentors');
  const officerRankFilter = document.getElementById('officerRankFilter');
  const mentorRankFilter = document.getElementById('mentorRankFilter');
  const addMentorBtn = document.getElementById('addStructureMentor');
  const saveBtn = document.getElementById('saveGuildStructure');

  if (!message || !councilBox || !mentorsBox || !officerRankFilter || !mentorRankFilter || !addMentorBtn || !saveBtn) return;

  const specData = window.ODIT_RECRUITMENT_SPEC_DATA || { classes: [] };
  const esc = (s = '') => String(s).replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
  const norm = (s = '') => String(s).toLowerCase().replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

  let client;
  let loaded = false;
  let directory = [];

  // ODit's agreed hierarchy is 1-based. Blizzard commonly numbers guild ranks
  // from zero, so labels take precedence; numeric IDs are mapped carefully.
  const RANKS = [
    'The Big Duck', 'Wing Commander', 'Flight Leader', 'The Flock',
    'Duckling', 'Pond Dweller', 'Decoy', 'Sitting Duck'
  ];
  const DEFAULT_OFFICER_FILTER = 'upto:2'; // Rank 2, Wing Commander and above
  const DEFAULT_MENTOR_FILTER = 'upto:4';  // Rank 4, The Flock and above
  let numericRankOffset = 1;

  function rankOrdinal(character) {
    const label = norm(character.guild_rank_text || '');
    const byName = RANKS.findIndex(name => label === norm(name) ||
      (label.includes(norm(name)) && !RANKS.some(other => other !== name &&
        norm(other).includes(norm(name)))));
    if (byName >= 0) return byName + 1;
    const n = Number(character.guild_rank);
    return character.guild_rank != null && Number.isInteger(n) && n + numericRankOffset >= 1 && n + numericRankOffset <= RANKS.length
      ? n + numericRankOffset : null;
  }

  function detectNumbering() {
    for (const c of directory) {
      const nameIndex = RANKS.findIndex(name => norm(name) === norm(c.guild_rank_text || ''));
      if (nameIndex !== -1 && c.guild_rank !== null && c.guild_rank !== undefined) {
        const n = Number(c.guild_rank);
        if (Number.isInteger(n) && (nameIndex + 1 - n === 0 || nameIndex + 1 - n === 1)) {
          numericRankOffset = nameIndex + 1 - n;
          return;
        }
      }
    }
    numericRankOffset = directory.some(c => c.guild_rank != null && Number(c.guild_rank) === 0) ? 1
      : directory.some(c => c.guild_rank != null && Number(c.guild_rank) === 8) ? 0 : 1;
  }

  function matchesFilter(character, filter) {
    if (filter === 'all') return true;
    const ordinal = rankOrdinal(character);
    if (ordinal === null) return false;
    const [mode, n] = String(filter).split(':');
    return mode === 'exact' ? ordinal === Number(n) : ordinal <= Number(n);
  }

  function filterOptions(defaultFilter) {
    return [
      ...RANKS.map((name, i) => {
        const code = `upto:${i + 1}`;
        return `<option value="${code}" ${code === defaultFilter ? 'selected' : ''}>Rank ${i + 1}: ${esc(name)} & above</option>`;
      }),
      '<option value="all">All guild ranks</option>',
      ...RANKS.map((name, i) => `<option value="exact:${i + 1}">Only rank ${i + 1}: ${esc(name)}</option>`)
    ].join('');
  }

  officerRankFilter.innerHTML = filterOptions(DEFAULT_OFFICER_FILTER);
  mentorRankFilter.innerHTML = filterOptions(DEFAULT_MENTOR_FILTER);

  const filterFor = select => select.classList.contains('mentor-character')
    ? mentorRankFilter.value : officerRankFilter.value;

  const show = (text, kind = 'info') => {
    message.hidden = false;
    message.className = `notice ${kind}`;
    message.textContent = text;
  };
  const hide = () => { message.hidden = true; };

  function directoryRecord(id) {
    return directory.find(c => String(c.id) === String(id)) || null;
  }

  // New appointments store only GoW character IDs. Old roster links remain
  // untouched until an officer actively chooses a guild-directory character.
  function resolveStored(value) {
    if (!value) return '';
    if (typeof value === 'object' && value.directory_character_id) {
      return directoryRecord(value.directory_character_id) ? String(value.directory_character_id) : '';
    }
    if (typeof value !== 'string') return '';
    const matches = directory.filter(c =>
      norm(c.character_name) === norm(value) || norm(c.display_name) === norm(value)
    );
    return matches.length === 1 ? String(matches[0].id) : '';
  }

  function legacyLabel(value) {
    if (typeof value === 'string') return value;
    if (value?.directory_character_id) return `Directory ID ${value.directory_character_id}`;
    if (value?.character_id) return 'Previously linked raid character';
    return 'Existing assignment';
  }

  function characterOption(c, selected = '', prefix = '') {
    const role = [c.spec_name, c.class_name].filter(Boolean).join(' ');
    const rank = c.guild_rank_text || '';
    const realm = c.realm || '';
    const label = [prefix, c.character_name, role, rank, realm].filter(Boolean).join(' • ');
    return `<option value="${esc(c.id)}" ${String(c.id) === selected ? 'selected' : ''}>${esc(label)}</option>`;
  }

  function directoryOptions(value = null, filter = DEFAULT_OFFICER_FILTER) {
    const selected = resolveStored(value);
    const keepLegacy = !!value && !selected;
    const existingCharacter = selected ? directoryRecord(selected) : null;
    const options = ['<option value="">— Not appointed —</option>'];

    // Never discard an existing appointment just because its rank is currently
    // hidden by the filter. The officer must explicitly remove or change it.
    if (existingCharacter && !matchesFilter(existingCharacter, filter)) {
      options.push(characterOption(existingCharacter, selected, 'Current selection (outside filter)'));
    }
    options.push(...directory.filter(c => matchesFilter(c, filter)).map(c => characterOption(c, selected)));
    if (keepLegacy) {
      options.unshift(`<option value="__keep__" selected>Keep: ${esc(legacyLabel(value))}</option>`);
    }
    return options.join('');
  }

  function applyLegacy(select, value) {
    select.dataset.legacy = value ? JSON.stringify(value) : '';
    select.innerHTML = directoryOptions(value, filterFor(select));
  }

  function refreshCharacterOptions() {
    document.querySelectorAll('[data-structure-owner],.mentor-character').forEach(select => {
      const existing = getSelected(select);
      applyLegacy(select, existing);
    });
    updateCouncilPreview();
    updateHelp();
  }

  function getSelected(select) {
    if (select.value === '__keep__') {
      try { return JSON.parse(select.dataset.legacy || 'null'); }
      catch { return null; }
    }
    if (!select.value) return null;
    const record = directoryRecord(select.value);
    return record ? { directory_character_id: String(record.id) } : null;
  }

  // The Tavern Council IS the set of appointed officer-role holders.
  // This is a read-only live preview; there is no second Council roster.
  function councilFromSelections() {
    const people = new Map();
    document.querySelectorAll('[data-structure-owner]').forEach(select => {
      const value = getSelected(select);
      if (!value) return;
      const key = value.directory_character_id ? `dir:${value.directory_character_id}`
        : `legacy:${JSON.stringify(value)}`;
      const label = select.closest('.field')?.querySelector('label')?.textContent?.trim() || 'Officer';
      if (!people.has(key)) people.set(key, { value, roles: [] });
      people.get(key).roles.push(label);
    });
    return [...people.values()];
  }

  function updateCouncilPreview() {
    const entries = councilFromSelections();
    if (!entries.length) {
      councilBox.innerHTML = '<p class="help">No officer roles have been assigned yet. Council members will appear here as you appoint officers below.</p>';
      return;
    }
    councilBox.innerHTML = entries.map(item => {
      const record = item.value.directory_character_id
        ? directoryRecord(item.value.directory_character_id) : null;
      const name = record?.character_name || legacyLabel(item.value);
      return `<div class="council-preview-entry"><strong>${esc(name)}</strong>
        <span>${esc(item.roles.join(' · '))}</span></div>`;
    }).join('');
  }

  function updateHelp() {
    const el = document.querySelector('.structure-admin > p.help');
    if (!el) return;
    const officers = directory.filter(c => matchesFilter(c, officerRankFilter.value)).length;
    const mentors = directory.filter(c => matchesFilter(c, mentorRankFilter.value)).length;
    el.textContent = `${officers} characters match the officer rank filter; ${mentors} match the mentor filter (${directory.length} in the Guild Directory). Rank filters only change available choices, not saved appointments.`;
  }

  function classOptions(selected) {
    return (specData.classes || []).map(cls =>
      `<option value="${esc(cls.name)}" ${cls.name === selected ? 'selected' : ''}>${esc(cls.name)}</option>`
    ).join('');
  }
  function specOptions(clsName, selected) {
    const cls = (specData.classes || []).find(x => x.name === clsName);
    return (cls?.specs || []).map(spec =>
      `<option value="${esc(spec.name)}" ${spec.name === selected ? 'selected' : ''}>${esc(spec.name)}</option>`
    ).join('');
  }

  function parseLegacySpec(value) {
    for (const cls of specData.classes || []) {
      for (const spec of cls.specs || []) {
        if (norm(value) === norm(`${spec.name} ${cls.name}`) ||
            norm(value) === norm(`${cls.name} ${spec.name}`)) {
          return { className: cls.name, specName: spec.name };
        }
      }
    }
    return null;
  }

  function addMentorRow(data = {}) {
    const parsed = parseLegacySpec(data.spec || '');
    const className = data.class_name || parsed?.className || specData.classes?.[0]?.name || '';
    const cls = (specData.classes || []).find(item => item.name === className);
    const specName = data.spec_name || parsed?.specName || cls?.specs?.[0]?.name || '';
    const selected = data.directory_character_id
      ? { directory_character_id: data.directory_character_id }
      : (data.member_id || data.character_id ? data : data.mentor || null);

    const row = document.createElement('div');
    row.className = 'mentor-admin-row';
    row.innerHTML = `
      <div class="field"><label>Class</label><select class="mentor-class">${classOptions(className)}</select></div>
      <div class="field"><label>Spec</label><select class="mentor-spec"></select></div>
      <div class="field"><label>Mentor character</label><select class="mentor-character"></select></div>
      <button class="btn danger remove-structure-mentor" type="button">Remove</button>`;

    const classSelect = row.querySelector('.mentor-class');
    const specSelect = row.querySelector('.mentor-spec');
    const refresh = selectedSpec => { specSelect.innerHTML = specOptions(classSelect.value, selectedSpec); };
    refresh(specName);
    classSelect.addEventListener('change', () => refresh(''));
    applyLegacy(row.querySelector('.mentor-character'), selected);
    row.querySelector('.remove-structure-mentor')?.addEventListener('click', () => row.remove());
    mentorsBox.appendChild(row);
  }

  function render(structure) {
    const assignments = structure?.assignments || {};
    const oldDps = assignments['dps-lead'];
    document.querySelectorAll('[data-structure-owner]').forEach(select => {
      const key = select.dataset.structureOwner;
      applyLegacy(select, assignments[key] ?? (key === 'melee-dps-lead' ? oldDps : null));
    });

    updateCouncilPreview();

    mentorsBox.innerHTML = '';
    const mentors = Array.isArray(structure?.mentors) ? structure.mentors : [];
    mentors.forEach(addMentorRow);
    if (!mentors.length) addMentorRow();
  }

  async function load() {
    loaded = false;
    saveBtn.disabled = true;
    const [structureResult, dirResult] = await Promise.all([
      client.from('guild_structure')
        .select('assignments,mentors,council').eq('id', 1).maybeSingle(),
      client.rpc('get_officer_guild_directory')
    ]);
    if (structureResult.error || dirResult.error) {
      show(`Could not load Guild Directory: ${(structureResult.error || dirResult.error).message}`, 'error');
      return;
    }
    directory = Array.isArray(dirResult.data) ? dirResult.data : [];
    detectNumbering();
    if (!directory.length) {
      show('Guild Directory is empty. Run the guild-directory-sync Edge Function before editing roles.', 'info');
      return;
    }
    render(structureResult.data || {});
    loaded = true;
    saveBtn.disabled = false;

    updateHelp();
    if (!directory.some(c => matchesFilter(c, DEFAULT_OFFICER_FILTER))) {
      show('No characters match Wing Commander and above. Use the officer rank filter to inspect the imported guild ranks. Existing appointments are preserved.', 'info');
    }
  }

  async function save() {
    if (!loaded) return;
    hide();
    const assignments = {};
    document.querySelectorAll('[data-structure-owner]').forEach(select => {
      assignments[select.dataset.structureOwner] = getSelected(select);
    });
    const uniqueCouncil = councilFromSelections().map(item => item.value);
    const mentors = [...mentorsBox.querySelectorAll('.mentor-admin-row')].map(row => {
      const existing = getSelected(row.querySelector('.mentor-character'));
      const item = {
        class_name: row.querySelector('.mentor-class').value,
        spec_name: row.querySelector('.mentor-spec').value
      };
      if (existing?.directory_character_id) item.directory_character_id = existing.directory_character_id;
      else if (typeof existing === 'object' && existing !== null) {
        if (existing.member_id) item.member_id = existing.member_id;
        if (existing.character_id) item.character_id = existing.character_id;
      } else if (typeof existing === 'string') item.mentor = existing;
      return item;
    }).filter(item => item.class_name && item.spec_name);

    saveBtn.disabled = true;
    const { error } = await client.from('guild_structure')
      .update({ assignments, council: uniqueCouncil, mentors }).eq('id', 1);
    if (error) {
      saveBtn.disabled = false;
      show(`Could not save guild structure: ${error.message}`, 'error');
      return;
    }
    await load();
    show('Guild structure saved using Guild Directory character links.', 'success');
  }

  officerRankFilter.addEventListener('change', refreshCharacterOptions);
  mentorRankFilter.addEventListener('change', refreshCharacterOptions);
  document.querySelectorAll('[data-structure-owner]').forEach(select =>
    select.addEventListener('change', updateCouncilPreview));
  addMentorBtn.addEventListener('click', () => addMentorRow());
  saveBtn.addEventListener('click', save);

  function ready(detail) { client = detail.client; load(); }
  if (window.ODIT_OFFICER?.ready) ready(window.ODIT_OFFICER);
  else window.addEventListener('odit:officer-ready', e => ready(e.detail), { once: true });
})();
