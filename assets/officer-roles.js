(() => {
  const message = document.getElementById('structureMessage');
  const councilBox = document.getElementById('structureCouncil');
  const mentorsBox = document.getElementById('structureMentors');
  const addCouncilBtn = document.getElementById('addCouncilMember');
  const addMentorBtn = document.getElementById('addStructureMentor');
  const saveBtn = document.getElementById('saveGuildStructure');

  if (!message || !councilBox || !mentorsBox || !addCouncilBtn || !addMentorBtn || !saveBtn) return;

  const specData = window.ODIT_RECRUITMENT_SPEC_DATA || { classes: [] };

  let client;
  let loaded = false;
  let members = [];
  let characters = [];
  let refs = [];

  const esc = (s = '') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const normalise = (s = '') => String(s)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const show = (text, kind = 'info') => {
    message.hidden = false;
    message.className = `notice ${kind}`;
    message.textContent = text;
  };

  const hide = () => { message.hidden = true; };

  const refKey = ref => ref ? `${ref.memberId}|${ref.characterId}` : '';

  function parseRefKey(value = '') {
    const [memberId, characterId] = String(value).split('|');
    return memberId && characterId ? { memberId, characterId } : null;
  }

  function buildRefs() {
    const memberMap = new Map(members.map(member => [member.id, member]));

    refs = characters
      .map(character => {
        const member = memberMap.get(character.member_id);
        if (!member) return null;

        return {
          memberId: member.id,
          characterId: character.id,
          playerName: member.player_name || '',
          characterName: character.character_name || '',
          className: character.class_name || '',
          specName: character.spec_name || '',
          avatarUrl: character.avatar_url || '',
          raiderioUrl: character.raiderio_url || '',
          armoryUrl: character.armory_url || ''
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        String(a.playerName).localeCompare(String(b.playerName)) ||
        String(a.characterName).localeCompare(String(b.characterName))
      );
  }

  function refLabel(ref) {
    const spec = [ref.specName, ref.className].filter(Boolean).join(' ');
    const player = ref.playerName && normalise(ref.playerName) !== normalise(ref.characterName)
      ? ` — ${ref.playerName}`
      : '';

    return `${ref.characterName || ref.playerName}${player}${spec ? ` • ${spec}` : ''}`;
  }

  function characterOptions(selected = '') {
    return [
      '<option value="">— Not appointed —</option>',
      ...refs.map(ref => {
        const key = refKey(ref);
        return `<option value="${esc(key)}" ${key === selected ? 'selected' : ''}>${esc(refLabel(ref))}</option>`;
      })
    ].join('');
  }

  function findRefByStoredIds(value) {
    if (!value || typeof value !== 'object') return null;

    const memberId = String(value.member_id || '');
    const characterId = String(value.character_id || '');

    return refs.find(ref => characterId && ref.characterId === characterId) ||
      refs.find(ref => memberId && ref.memberId === memberId) ||
      null;
  }

  function findLegacyRef(value) {
    if (typeof value !== 'string' || !value.trim()) return null;

    const target = normalise(value);

    const exact = refs.filter(ref =>
      normalise(ref.playerName) === target ||
      normalise(ref.characterName) === target
    );

    if (exact.length === 1) return exact[0];

    const prefix = refs.filter(ref => {
      const player = normalise(ref.playerName);
      const character = normalise(ref.characterName);

      return player.startsWith(target) ||
        character.startsWith(target) ||
        target.startsWith(player) ||
        target.startsWith(character);
    });

    return prefix.length === 1 ? prefix[0] : null;
  }

  function storedSelection(value) {
    return refKey(findRefByStoredIds(value) || findLegacyRef(value));
  }

  function selectedRef(select) {
    const parsed = parseRefKey(select.value);
    if (!parsed) return null;

    return refs.find(ref =>
      ref.memberId === parsed.memberId &&
      ref.characterId === parsed.characterId
    ) || null;
  }

  function addCouncilRow(selected = '') {
    const row = document.createElement('div');
    row.className = 'council-admin-row';
    row.innerHTML = `
      <div class="field">
        <label>Council character</label>
        <select class="council-character">${characterOptions(selected)}</select>
      </div>
      <button class="btn danger remove-council-member" type="button">Remove</button>
    `;

    row.querySelector('.remove-council-member')?.addEventListener('click', () => row.remove());
    councilBox.appendChild(row);
  }

  function classOptions(selected = '') {
    return (specData.classes || []).map(cls =>
      `<option value="${esc(cls.name)}" ${cls.name === selected ? 'selected' : ''}>${esc(cls.name)}</option>`
    ).join('');
  }

  function specOptions(className, selected = '') {
    const cls = (specData.classes || []).find(item => item.name === className);
    return (cls?.specs || []).map(spec =>
      `<option value="${esc(spec.name)}" ${spec.name === selected ? 'selected' : ''}>${esc(spec.name)}</option>`
    ).join('');
  }

  function parseLegacySpec(value = '') {
    const target = normalise(value);

    for (const cls of specData.classes || []) {
      for (const spec of cls.specs || []) {
        if (
          target === normalise(`${spec.name} ${cls.name}`) ||
          target === normalise(`${cls.name} ${spec.name}`)
        ) {
          return { className: cls.name, specName: spec.name };
        }
      }
    }

    return null;
  }

  function mentorValues(mentor = {}) {
    const legacy = !mentor.class_name || !mentor.spec_name
      ? parseLegacySpec(mentor.spec || '')
      : null;

    const className = mentor.class_name || legacy?.className || specData.classes?.[0]?.name || '';
    const cls = (specData.classes || []).find(item => item.name === className);
    const specName = mentor.spec_name || legacy?.specName || cls?.specs?.[0]?.name || '';
    const ref = findRefByStoredIds(mentor) || findLegacyRef(mentor.mentor);

    return {
      className,
      specName,
      selectedRef: refKey(ref)
    };
  }

  function addMentorRow(mentor = {}) {
    const values = mentorValues(mentor);
    const row = document.createElement('div');
    row.className = 'mentor-admin-row';

    row.innerHTML = `
      <div class="field">
        <label>Class</label>
        <select class="mentor-class">${classOptions(values.className)}</select>
      </div>
      <div class="field">
        <label>Spec</label>
        <select class="mentor-spec"></select>
      </div>
      <div class="field">
        <label>Mentor character</label>
        <select class="mentor-character">${characterOptions(values.selectedRef)}</select>
      </div>
      <button class="btn danger remove-structure-mentor" type="button">Remove</button>
    `;

    const classSelect = row.querySelector('.mentor-class');
    const specSelect = row.querySelector('.mentor-spec');

    const refreshSpecs = selected => {
      specSelect.innerHTML = specOptions(classSelect.value, selected);
    };

    refreshSpecs(values.specName);
    classSelect.addEventListener('change', () => refreshSpecs(''));
    row.querySelector('.remove-structure-mentor')?.addEventListener('click', () => row.remove());
    mentorsBox.appendChild(row);
  }

  function renderAssignments(stored = {}) {
    const legacyDps = typeof stored['dps-lead'] === 'string' ? stored['dps-lead'] : '';

    document.querySelectorAll('[data-structure-owner]').forEach(select => {
      const key = select.dataset.structureOwner;
      const value = stored[key] ?? (key === 'melee-dps-lead' ? legacyDps : null);
      select.innerHTML = characterOptions(storedSelection(value));
    });
  }

  function renderCouncil(council = []) {
    councilBox.innerHTML = '';

    (Array.isArray(council) ? council : []).forEach(item => {
      const selected = refKey(findRefByStoredIds(item));
      if (selected) addCouncilRow(selected);
    });

    if (!councilBox.children.length) addCouncilRow('');
  }

  function renderMentors(mentors = []) {
    mentorsBox.innerHTML = '';
    (Array.isArray(mentors) ? mentors : []).forEach(addMentorRow);
    if (!mentorsBox.children.length) addMentorRow({});
  }

  async function load() {
    hide();
    loaded = false;

    const [
      { data: structure, error: structureError },
      { data: memberData, error: memberError },
      { data: characterData, error: characterError }
    ] = await Promise.all([
      client.from('guild_structure')
        .select('assignments,mentors,council,updated_at')
        .eq('id', 1)
        .maybeSingle(),
      client.from('raid_roster_members')
        .select('id,player_name')
        .order('player_name'),
      client.from('raid_roster_characters')
        .select('id,member_id,character_name,class_name,spec_name,avatar_url,raiderio_url,armory_url,is_main,is_raid_character')
        .order('character_name')
    ]);

    const error = structureError || memberError || characterError;

    if (error) {
      show(`Could not load guild structure: ${error.message}`, 'error');
      return;
    }

    members = memberData || [];
    characters = characterData || [];
    buildRefs();

    if (!refs.length) {
      show('No linked guild characters are available yet. Add characters in the Roster before assigning Guild Structure roles.', 'info');
    }

    renderAssignments(structure?.assignments || {});
    renderCouncil(structure?.council || []);
    renderMentors(structure?.mentors || []);
    loaded = true;
  }

  async function save() {
    if (!loaded) return;

    hide();

    const assignments = {};

    document.querySelectorAll('[data-structure-owner]').forEach(select => {
      const ref = selectedRef(select);
      assignments[select.dataset.structureOwner] = ref
        ? { member_id: ref.memberId, character_id: ref.characterId }
        : null;
    });

    const council = [...councilBox.querySelectorAll('.council-admin-row')]
      .map(row => selectedRef(row.querySelector('.council-character')))
      .filter(Boolean)
      .filter((ref, index, array) =>
        array.findIndex(item =>
          item.memberId === ref.memberId &&
          item.characterId === ref.characterId
        ) === index
      )
      .map(ref => ({
        member_id: ref.memberId,
        character_id: ref.characterId
      }));

    const mentors = [...mentorsBox.querySelectorAll('.mentor-admin-row')]
      .map(row => {
        const ref = selectedRef(row.querySelector('.mentor-character'));

        return {
          class_name: row.querySelector('.mentor-class').value,
          spec_name: row.querySelector('.mentor-spec').value,
          member_id: ref?.memberId || null,
          character_id: ref?.characterId || null
        };
      })
      .filter(item => item.class_name && item.spec_name);

    saveBtn.disabled = true;

    const { error } = await client
      .from('guild_structure')
      .update({ assignments, council, mentors })
      .eq('id', 1);

    saveBtn.disabled = false;

    if (error) {
      show(`Could not save guild structure: ${error.message}`, 'error');
      return;
    }

    show('Guild structure saved. Linked character details will now be used on the public page.', 'success');
    await load();
  }

  addCouncilBtn.addEventListener('click', () => addCouncilRow(''));
  addMentorBtn.addEventListener('click', () => addMentorRow({}));
  saveBtn.addEventListener('click', save);

  function ready(detail) {
    client = detail.client;
    load();
  }

  if (window.ODIT_OFFICER?.ready) ready(window.ODIT_OFFICER);
  else window.addEventListener('odit:officer-ready', event => ready(event.detail), { once: true });
})();
