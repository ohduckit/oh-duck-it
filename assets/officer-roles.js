(() => {
  const message = document.getElementById('structureMessage');
  const councilBox = document.getElementById('structureCouncil');
  const mentorsBox = document.getElementById('structureMentors');
  const addCouncilBtn = document.getElementById('addCouncilMember');
  const addMentorBtn = document.getElementById('addStructureMentor');
  const saveBtn = document.getElementById('saveGuildStructure');

  if (!message || !councilBox || !mentorsBox || !addCouncilBtn || !addMentorBtn || !saveBtn) return;

  const specData = window.ODIT_RECRUITMENT_SPEC_DATA || { classes: [] };
  const esc = (s = '') => String(s).replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
  const norm = (s = '') => String(s).toLowerCase().replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

  let client;
  let loaded = false;
  let directory = [];

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

  function directoryOptions(value = null) {
    const selected = resolveStored(value);
    const keepLegacy = !!value && !selected;
    const options = [
      '<option value="">— Not appointed —</option>',
      ...directory.map(c => {
        const role = [c.spec_name, c.class_name].filter(Boolean).join(' ');
        const rank = c.guild_rank_text || '';
        const realm = c.realm || '';
        const label = [c.character_name, role, rank, realm].filter(Boolean).join(' • ');
        return `<option value="${esc(c.id)}" ${String(c.id) === selected ? 'selected' : ''}>${esc(label)}</option>`;
      })
    ];
    if (keepLegacy) options.unshift(`<option value="__keep__" selected>Keep: ${esc(legacyLabel(value))}</option>`);
    return options.join('');
  }

  function applyLegacy(select, value) {
    select.dataset.legacy = value ? JSON.stringify(value) : '';
    select.innerHTML = directoryOptions(value);
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

  function addCouncilRow(value = null) {
    const row = document.createElement('div');
    row.className = 'council-admin-row';
    row.innerHTML = `
      <div class="field"><label>Council character</label><select class="council-character"></select></div>
      <button class="btn danger remove-council-member" type="button">Remove</button>`;
    applyLegacy(row.querySelector('.council-character'), value);
    row.querySelector('.remove-council-member')?.addEventListener('click', () => row.remove());
    councilBox.appendChild(row);
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

    councilBox.innerHTML = '';
    const council = Array.isArray(structure?.council) ? structure.council : [];
    council.forEach(addCouncilRow);
    if (!council.length) addCouncilRow();

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
    if (!directory.length) {
      show('Guild Directory is empty. Run the guild-directory-sync Edge Function before editing roles.', 'info');
      return;
    }
    render(structureResult.data || {});
    loaded = true;
    saveBtn.disabled = false;

    const help = document.querySelector('.structure-admin > p.help');
    if (help) help.textContent =
      `Select from ${directory.length} guild characters imported from Guilds of WoW. The Raid Team remains independent.`;
  }

  async function save() {
    if (!loaded) return;
    hide();
    const assignments = {};
    document.querySelectorAll('[data-structure-owner]').forEach(select => {
      assignments[select.dataset.structureOwner] = getSelected(select);
    });
    const council = [...councilBox.querySelectorAll('.council-character')]
      .map(getSelected).filter(Boolean);
    const uniqueCouncil = council.filter((value, index) =>
      council.findIndex(other => JSON.stringify(other) === JSON.stringify(value)) === index
    );
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

  addCouncilBtn.addEventListener('click', () => addCouncilRow());
  addMentorBtn.addEventListener('click', () => addMentorRow());
  saveBtn.addEventListener('click', save);

  function ready(detail) { client = detail.client; load(); }
  if (window.ODIT_OFFICER?.ready) ready(window.ODIT_OFFICER);
  else window.addEventListener('odit:officer-ready', e => ready(e.detail), { once: true });
})();
