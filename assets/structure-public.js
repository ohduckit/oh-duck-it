(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const cfg = window.ODIT_SUPABASE || {};
  const specData = window.ODIT_RECRUITMENT_SPEC_DATA || { classes: [] };
  const esc = (s = '') => String(s).replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
  const classColors = Object.fromEntries((specData.classes || []).map(c => [c.name, c.color]));
  const safeUrl = value => {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };

  $$('.role').forEach(card => card.addEventListener('click', e => {
    // Following a character profile link should not expand/collapse the role.
    if (e.target.closest('a')) return;
    card.classList.toggle('open');
  }));
  $('#expandBtn')?.addEventListener('click', () => {
    const roles = $$('.role');
    const all = roles.every(r => r.classList.contains('open'));
    roles.forEach(r => r.classList.toggle('open', !all));
    $('#expandBtn').textContent = all ? 'Expand all' : 'Collapse all';
  });

  function specIcon(className, specName) {
    const cls = (specData.classes || []).find(c => c.name === className);
    return cls?.specs?.find(s => s.name === specName)?.icon || '';
  }

  function mapPeople(oldRows, dirRows) {
    const byMember = new Map();
    const byCharacter = new Map();
    const byDirectory = new Map();
    oldRows.forEach(c => {
      if (c.member_id && !byMember.has(String(c.member_id))) byMember.set(String(c.member_id), c);
      if (c.character_id) byCharacter.set(String(c.character_id), c);
    });
    dirRows.forEach(c => {
      if (c.directory_character_id) byDirectory.set(String(c.directory_character_id), c);
    });
    return { byMember, byCharacter, byDirectory };
  }

  function resolve(value, maps) {
    if (!value || typeof value !== 'object') return null;
    if (value.directory_character_id) {
      return maps.byDirectory.get(String(value.directory_character_id)) || null;
    }
    if (value.character_id && maps.byCharacter.has(String(value.character_id))) {
      return maps.byCharacter.get(String(value.character_id));
    }
    return value.member_id ? maps.byMember.get(String(value.member_id)) || null : null;
  }

  function personMarkup(person, fallback = 'To be appointed') {
    if (!person) return `<span>${esc(fallback)}</span>`;
    const characterName = person.character_name || person.player_name || 'Guild member';
    const playerName = person.player_name && person.player_name !== characterName ? person.player_name : '';
    const meta = [playerName, person.spec_name, person.class_name].filter(Boolean).join(' ');
    const rank = person.guild_rank_text || '';
    const avatar = safeUrl(person.avatar_url || '') || safeUrl(specIcon(person.class_name, person.spec_name));
    const href = safeUrl(person.raiderio_url || person.armory_url || '');
    const tag = href ? 'a' : 'div';
    const attrs = href ? ` href="${esc(href)}" target="_blank" rel="noopener noreferrer"` : '';
    const color = classColors[person.class_name] || '#b88635';

    return `<${tag} class="structure-person" style="--class-color:${esc(color)}"${attrs}>
      ${avatar ? `<img class="structure-person-avatar" src="${esc(avatar)}" alt="" loading="lazy">`
        : '<div class="structure-person-avatar"></div>'}
      <span class="structure-person-copy">
        <b>${esc(characterName)}</b>
        ${meta ? `<small>${esc(meta)}</small>` : ''}
        ${rank ? `<small>Guild rank: ${esc(rank)}</small>` : ''}
      </span>
    </${tag}>`;
  }

  function ownerValue(value, maps) {
    const person = resolve(value, maps);
    return personMarkup(person, typeof value === 'string' && value.trim() ? value : 'To be appointed');
  }

  function renderOwners(assignments, maps) {
    const oldDps = assignments['dps-lead'];
    $$('[data-owner]').forEach(el => {
      const value = assignments[el.dataset.owner] ??
        (el.dataset.owner === 'melee-dps-lead' ? oldDps : null);
      el.innerHTML = ownerValue(value, maps);
    });
  }

  function renderCouncil(council, maps) {
    const box = $('#councilMembers');
    if (!box) return;
    const people = (Array.isArray(council) ? council : [])
      .map(v => resolve(v, maps)).filter(Boolean);
    if (!people.length) {
      box.innerHTML = '<div class="note" style="grid-column:1/-1">Council characters have not yet been assigned.</div>';
      return;
    }
    box.innerHTML = people.map(p => `<div class="council-member-card">${personMarkup(p)}</div>`).join('');
  }

  function renderMentors(mentors, maps) {
    const box = $('#mentorList');
    if (!box) return;
    if (!Array.isArray(mentors) || !mentors.length) {
      box.innerHTML = '<div class="note" style="grid-column:1/-1">No class/spec mentors appointed.</div>';
      return;
    }
    box.innerHTML = mentors.map(item => {
      const label = item.class_name && item.spec_name
        ? `${item.spec_name} ${item.class_name}`
        : item.spec || 'Class / spec';
      const icon = safeUrl(specIcon(item.class_name, item.spec_name));
      const person = resolve(item, maps);
      const legacy = typeof item.mentor === 'string' ? item.mentor : 'Vacant';
      return `<div class="mentor">
        ${icon ? `<img class="mentor-spec-icon" src="${esc(icon)}" alt="" loading="lazy">` : ''}
        <div class="mentor-main">
          <strong>${esc(label)}</strong>
          ${personMarkup(person, legacy)}
        </div>
      </div>`;
    }).join('');
  }

  function unavailable() {
    $$('[data-owner]').forEach(el => { el.textContent = 'Unavailable'; });
    if ($('#councilMembers')) $('#councilMembers').textContent = 'Council information unavailable.';
    if ($('#mentorList')) $('#mentorList').textContent = 'Mentor information unavailable.';
  }

  if (!cfg.url || !cfg.key || !window.supabase?.createClient) {
    unavailable();
    return;
  }
  const client = window.supabase.createClient(cfg.url, cfg.key);

  async function load() {
    const [structureResult, directoryResult, oldResult] = await Promise.all([
      client.from('guild_structure').select('assignments,mentors,council').eq('id', 1).maybeSingle(),
      client.rpc('get_public_guild_directory_characters'),
      client.rpc('get_public_structure_characters')
    ]);
    if (structureResult.error || !structureResult.data) {
      unavailable();
      return;
    }
    // Legacy raid-linked assignments still work during migration.
    const oldRows = !oldResult.error && Array.isArray(oldResult.data) ? oldResult.data : [];
    const dirRows = !directoryResult.error && Array.isArray(directoryResult.data) ? directoryResult.data : [];
    const maps = mapPeople(oldRows, dirRows);
    const data = structureResult.data;
    renderOwners(data.assignments || {}, maps);
    renderCouncil(data.council || [], maps);
    renderMentors(data.mentors || [], maps);
  }

  load();
})();
