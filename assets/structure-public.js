(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  $$('.role').forEach(card => card.addEventListener('click', () => card.classList.toggle('open')));

  $('#expandBtn')?.addEventListener('click', () => {
    const roles = $$('.role');
    const allOpen = roles.every(role => role.classList.contains('open'));
    roles.forEach(role => role.classList.toggle('open', !allOpen));
    $('#expandBtn').textContent = allOpen ? 'Expand all' : 'Collapse all';
  });

  const cfg = window.ODIT_SUPABASE || {};
  const configured = cfg.url && cfg.key && !cfg.url.startsWith('YOUR_') && !cfg.key.startsWith('YOUR_') && window.supabase?.createClient;
  const specData = window.ODIT_RECRUITMENT_SPEC_DATA || { classes: [] };
  const classColors = Object.fromEntries((specData.classes || []).map(cls => [cls.name, cls.color || '#b88635']));

  const esc = (s = '') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  function specIcon(className, specName) {
    const cls = (specData.classes || []).find(item => item.name === className);
    return cls?.specs?.find(spec => spec.name === specName)?.icon || '';
  }

  function personMaps(rows = []) {
    const byCharacter = new Map();
    const byMember = new Map();

    rows.forEach(row => {
      if (row.character_id) byCharacter.set(String(row.character_id), row);
      if (row.member_id && !byMember.has(String(row.member_id))) byMember.set(String(row.member_id), row);
    });

    return { byCharacter, byMember };
  }

  function resolvePerson(reference, maps) {
    if (!reference || typeof reference !== 'object') return null;

    const characterId = String(reference.character_id || '');
    const memberId = String(reference.member_id || '');

    return (characterId ? maps.byCharacter.get(characterId) : null) ||
      (memberId ? maps.byMember.get(memberId) : null) ||
      null;
  }

  function personMarkup(person, { compact = false, fallback = '' } = {}) {
    if (!person) {
      return fallback
        ? `<span>${esc(fallback)}</span>`
        : '<span class="structure-vacant">To be appointed</span>';
    }

    const characterName = person.character_name || person.player_name || 'Guild member';
    const playerName = person.player_name && person.player_name !== characterName ? person.player_name : '';
    const specText = [person.spec_name, person.class_name].filter(Boolean).join(' ');
    const avatar = person.avatar_url || specIcon(person.class_name, person.spec_name);
    const href = person.raiderio_url || person.armory_url || '';
    const classColor = classColors[person.class_name] || '#b88635';
    const tag = href ? 'a' : 'div';
    const linkAttrs = href ? ` href="${esc(href)}" target="_blank" rel="noopener"` : '';
    const subline = [playerName, specText].filter(Boolean).join(' • ');

    return `
      <${tag} class="structure-person ${compact ? 'compact' : ''}" style="--class-color:${esc(classColor)}"${linkAttrs}>
        ${avatar ? `<img class="structure-person-avatar" src="${esc(avatar)}" alt="" loading="lazy">` : '<div class="structure-person-avatar"></div>'}
        <span class="structure-person-copy">
          <b>${esc(characterName)}</b>
          ${subline ? `<small>${esc(subline)}</small>` : ''}
        </span>
      </${tag}>
    `;
  }

  function legacyAssignment(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  function renderOwners(assignments = {}, maps) {
    const legacyDps = legacyAssignment(assignments['dps-lead']);

    $$('[data-owner]').forEach(el => {
      const key = el.dataset.owner;
      const value = assignments[key] ?? (key === 'melee-dps-lead' ? legacyDps : null);
      const person = resolvePerson(value, maps);
      const fallback = legacyAssignment(value) || (key === 'melee-dps-lead' ? legacyDps : '');
      el.innerHTML = personMarkup(person, { compact: true, fallback: fallback || 'To be appointed' });
    });
  }

  function renderCouncil(council = [], maps) {
    const box = $('#councilMembers');
    if (!box) return;

    box.innerHTML = '';

    const people = (Array.isArray(council) ? council : [])
      .map(item => resolvePerson(item, maps))
      .filter(Boolean);

    if (!people.length) {
      box.innerHTML = '<div class="note" style="grid-column:1/-1">Council members have not yet been linked to guild characters.</div>';
      return;
    }

    people.forEach(person => {
      const card = document.createElement('div');
      card.className = 'council-member-card';
      card.innerHTML = personMarkup(person);
      box.appendChild(card);
    });
  }

  function legacyMentorSpec(mentor) {
    return mentor && typeof mentor.spec === 'string' ? mentor.spec.trim() : '';
  }

  function renderMentors(mentors = [], maps) {
    const list = $('#mentorList');
    if (!list) return;

    list.innerHTML = '';

    if (!Array.isArray(mentors) || !mentors.length) {
      list.innerHTML = '<div class="note" style="grid-column:1/-1">No class/spec mentors are currently appointed.</div>';
      return;
    }

    mentors.forEach(mentor => {
      const className = mentor?.class_name || '';
      const specName = mentor?.spec_name || '';
      const specLabel = className && specName ? `${specName} ${className}` : legacyMentorSpec(mentor) || 'Class / spec';
      const icon = className && specName ? specIcon(className, specName) : '';
      const person = resolvePerson(mentor, maps);
      const legacyName = typeof mentor?.mentor === 'string' ? mentor.mentor.trim() : '';
      const card = document.createElement('div');
      card.className = 'mentor';

      card.innerHTML = `
        ${icon ? `<img class="mentor-spec-icon" src="${esc(icon)}" alt="" loading="lazy">` : ''}
        <div class="mentor-main">
          <strong>${esc(specLabel)}</strong>
          ${person
            ? personMarkup(person, { compact: true })
            : legacyName
              ? `<div class="structure-vacant">Mentor: ${esc(legacyName)}</div>`
              : '<div class="structure-vacant">Vacant</div>'
          }
        </div>
      `;

      list.appendChild(card);
    });
  }

  function setUnavailable() {
    $$('[data-owner]').forEach(el => { el.textContent = 'Unavailable'; });

    const council = $('#councilMembers');
    if (council) council.innerHTML = '<div class="note" style="grid-column:1/-1">Council information is temporarily unavailable.</div>';

    const mentors = $('#mentorList');
    if (mentors) mentors.innerHTML = '<div class="note" style="grid-column:1/-1">Mentor information is temporarily unavailable.</div>';
  }

  if (!configured) {
    setUnavailable();
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.key);

  async function loadStructure() {
    const [
      { data: structure, error: structureError },
      { data: people, error: peopleError }
    ] = await Promise.all([
      client.from('guild_structure')
        .select('assignments,mentors,council')
        .eq('id', 1)
        .maybeSingle(),
      client.rpc('get_public_structure_characters')
    ]);

    if (structureError || !structure) {
      setUnavailable();
      return;
    }

    const maps = personMaps(peopleError ? [] : (Array.isArray(people) ? people : []));
    renderOwners(structure.assignments || {}, maps);
    renderCouncil(structure.council || [], maps);
    renderMentors(structure.mentors || [], maps);
  }

  loadStructure();
})();
