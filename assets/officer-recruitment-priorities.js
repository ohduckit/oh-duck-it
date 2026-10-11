(() => {
  const section = document.getElementById('recruitment');
  if (!section) return;

  const cssHref = 'assets/recruitment-spec-priorities.css';
  if (![...document.styleSheets].some(s => s.href?.endsWith(cssHref))) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.appendChild(link);
  }

  let client;
  let specData;
  let state = {};
  let exceptionalOpen = true;
  let recruitmentNote = '';
  let dirty = false;

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const labels = {
    closed:'Closed',
    low:'Low',
    medium:'Mid',
    high:'High'
  };

  function show(text, kind='info') {
    const message = document.getElementById('recruitmentPriorityMessage');
    if (!message) return;
    message.hidden = false;
    message.className = `notice ${kind}`;
    message.textContent = text;
  }

  function hideMessage() {
    const message = document.getElementById('recruitmentPriorityMessage');
    if (message) message.hidden = true;
  }

  function loadSpecData() {
    return new Promise((resolve, reject) => {
      if (window.ODIT_RECRUITMENT_SPEC_DATA) {
        resolve(window.ODIT_RECRUITMENT_SPEC_DATA);
        return;
      }

      const script = document.createElement('script');
      script.src = 'assets/recruitment-spec-data.js';
      script.onload = () => resolve(window.ODIT_RECRUITMENT_SPEC_DATA);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function allSpecs() {
    return specData.classes.flatMap(cls =>
      cls.specs.map(spec => ({
        ...spec,
        className:cls.name,
        classColor:cls.color,
        key:`${cls.name}|${spec.name}`
      }))
    );
  }

  function setDirty(value=true) {
    dirty = value;
    const el = document.getElementById('recruitUnsaved');
    if (!el) return;
    el.classList.toggle('clean', !dirty);
    el.textContent = dirty ? 'Unsaved recruitment changes' : 'All changes saved';
  }

  function summary() {
    const values = Object.values(state);
    for (const priority of ['high','medium','low','closed']) {
      const el = document.querySelector(`[data-summary="${priority}"]`);
      if (el) el.textContent = values.filter(v => v === priority).length;
    }
  }

  function applyFilters() {
    const search = (document.getElementById('recruitSearch')?.value || '').trim().toLowerCase();
    const role = document.getElementById('recruitRoleFilter')?.value || '';
    const activeOnly = document.getElementById('recruitActiveOnly')?.checked === true;

    document.querySelectorAll('.recruit-class-card').forEach(classCard => {
      let visible = 0;

      classCard.querySelectorAll('.recruit-admin-spec').forEach(card => {
        const text = `${card.dataset.class} ${card.dataset.spec}`.toLowerCase();
        const matchesSearch = !search || text.includes(search);
        const matchesRole = !role || card.dataset.role === role;
        const matchesActive = !activeOnly || state[card.dataset.key] !== 'closed';

        const showCard = matchesSearch && matchesRole && matchesActive;
        card.hidden = !showCard;
        if (showCard) visible++;
      });

      classCard.hidden = visible === 0;
    });
  }

  function selectPriority(card, priority) {
    state[card.dataset.key] = priority;

    card.querySelectorAll('[data-priority]').forEach(button => {
      button.classList.toggle('selected', button.dataset.priority === priority);
    });

    card.classList.toggle('active-priority', priority !== 'closed');
    setDirty(true);
    summary();
    applyFilters();
  }

  function build() {
    section.innerHTML = `
      <div class="priority-admin-head">
        <div>
          <h2>Class & Spec Recruitment</h2>
          <p class="help">
            Set recruitment at the spec level. Role priorities on the public website are derived automatically.
            Closed specs are hidden publicly; Low, Medium and High specs are shown.
          </p>
        </div>
        <div class="priority-admin-actions">
          <a class="btn" href="recruitment.html#looking" target="_blank" rel="noopener">View recruitment page ↗</a>
        </div>
      </div>

      <div id="recruitmentPriorityMessage" class="notice" style="margin:14px 0" hidden></div>

      <div class="recruit-priority-settings">
        <div class="field">
          <label for="recruitmentNote">Public recruitment note</label>
          <input id="recruitmentNote" maxlength="180"
                 placeholder="e.g. Our current focus is strengthening the DPS roster.">
        </div>

        <div class="field">
          <label>Outside current priorities</label>
          <label class="recruit-exceptional-toggle">
            <input id="recruitExceptionalOpen" type="checkbox">
            <span>Exceptional applicants are still welcome</span>
          </label>
        </div>
      </div>

      <div class="recruit-matrix-toolbar">
        <div class="field">
          <label for="recruitSearch">Find class / spec</label>
          <input id="recruitSearch" type="search" placeholder="Search…">
        </div>
        <div class="field">
          <label for="recruitRoleFilter">Role</label>
          <select id="recruitRoleFilter">
            <option value="">All roles</option>
            <option>Tank</option>
            <option>Healer</option>
            <option>Melee DPS</option>
            <option>Ranged DPS</option>
          </select>
        </div>
        <label class="recruit-exceptional-toggle">
          <input id="recruitActiveOnly" type="checkbox">
          <span>Show recruiting only</span>
        </label>
      </div>

      <div class="recruit-matrix-summary">
        <div class="recruit-matrix-stat"><b data-summary="high">0</b><span>High</span></div>
        <div class="recruit-matrix-stat"><b data-summary="medium">0</b><span>Medium</span></div>
        <div class="recruit-matrix-stat"><b data-summary="low">0</b><span>Low</span></div>
        <div class="recruit-matrix-stat"><b data-summary="closed">0</b><span>Closed</span></div>
      </div>

      <div id="recruitClassGrid" class="recruit-class-grid">
        ${specData.classes.map(cls => `
          <section class="recruit-class-card" style="--class-color:${esc(cls.color)}" data-class-card="${esc(cls.name)}">
            <h3 class="recruit-class-title">${esc(cls.name)}</h3>
            <div class="recruit-admin-spec-grid">
              ${cls.specs.map(spec => {
                const key = `${cls.name}|${spec.name}`;
                return `
                  <article class="recruit-admin-spec"
                           data-key="${esc(key)}"
                           data-class="${esc(cls.name)}"
                           data-spec="${esc(spec.name)}"
                           data-role="${esc(spec.role)}">
                    <img class="recruit-spec-admin-icon" src="${esc(spec.icon)}" alt="" loading="lazy">
                    <div class="recruit-admin-spec-name">
                      <b>${esc(spec.name)}</b>
                      <small>${esc(spec.role)}</small>
                    </div>
                    <div class="recruit-admin-priority" role="group" aria-label="${esc(spec.name)} recruitment priority">
                      ${['closed','low','medium','high'].map(priority =>
                        `<button type="button" data-priority="${priority}">${labels[priority]}</button>`
                      ).join('')}
                    </div>
                  </article>
                `;
              }).join('')}
            </div>
          </section>
        `).join('')}
      </div>

      <div class="recruit-savebar">
        <span id="recruitUnsaved" class="recruit-unsaved clean">All changes saved</span>
        <div class="actions">
          <button id="reloadRecruitmentPriorities" class="btn" type="button">Discard changes</button>
          <button id="saveRecruitmentPriorities" class="btn primary" type="button">Save recruitment priorities</button>
        </div>
      </div>
    `;

    document.querySelectorAll('.recruit-admin-spec').forEach(card => {
      card.querySelectorAll('[data-priority]').forEach(button => {
        button.addEventListener('click', () => selectPriority(card, button.dataset.priority));
      });
    });

    document.getElementById('recruitSearch')?.addEventListener('input', applyFilters);
    document.getElementById('recruitRoleFilter')?.addEventListener('change', applyFilters);
    document.getElementById('recruitActiveOnly')?.addEventListener('change', applyFilters);

    document.getElementById('recruitExceptionalOpen')?.addEventListener('change', event => {
      exceptionalOpen = event.target.checked;
      setDirty(true);
    });

    document.getElementById('recruitmentNote')?.addEventListener('input', event => {
      recruitmentNote = event.target.value;
      setDirty(true);
    });

    document.getElementById('saveRecruitmentPriorities')?.addEventListener('click', save);
    document.getElementById('reloadRecruitmentPriorities')?.addEventListener('click', load);
  }

  function renderState() {
    document.getElementById('recruitExceptionalOpen').checked = exceptionalOpen;
    document.getElementById('recruitmentNote').value = recruitmentNote;

    document.querySelectorAll('.recruit-admin-spec').forEach(card => {
      const priority = state[card.dataset.key] || 'closed';
      card.classList.toggle('active-priority', priority !== 'closed');

      card.querySelectorAll('[data-priority]').forEach(button => {
        button.classList.toggle('selected', button.dataset.priority === priority);
      });
    });

    summary();
    applyFilters();
    setDirty(false);
  }

  async function load() {
    hideMessage();

    const { data, error } = await client
      .from('recruitment_settings')
      .select('spec_priorities,exceptional_open,recruitment_note,updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      show(
        'The class/spec recruitment backend is not available yet. Run supabase-recruitment-spec-matrix-v2.sql first.',
        'error'
      );
      return;
    }

    const defaults = specData.defaults || {};
    state = { ...defaults, ...(data?.spec_priorities || {}) };
    exceptionalOpen = data?.exceptional_open !== false;
    recruitmentNote = data?.recruitment_note || '';

    // Guarantee all current specs have a valid state even after future additions.
    allSpecs().forEach(spec => {
      if (!['closed','low','medium','high'].includes(state[spec.key])) {
        state[spec.key] = 'closed';
      }
    });

    renderState();
  }

  async function save() {
    hideMessage();

    const note = String(document.getElementById('recruitmentNote')?.value || '').trim();
    const exceptional = document.getElementById('recruitExceptionalOpen')?.checked === true;
    const saveBtn = document.getElementById('saveRecruitmentPriorities');

    saveBtn.disabled = true;

    const cleanState = {};
    allSpecs().forEach(spec => {
      cleanState[spec.key] = ['closed','low','medium','high'].includes(state[spec.key])
        ? state[spec.key]
        : 'closed';
    });

    const { error } = await client
      .from('recruitment_settings')
      .update({
        spec_priorities:cleanState,
        exceptional_open:exceptional,
        recruitment_note:note || null
      })
      .eq('id', 1);

    saveBtn.disabled = false;

    if (error) {
      show(`Could not save recruitment priorities: ${error.message}`, 'error');
      return;
    }

    state = cleanState;
    exceptionalOpen = exceptional;
    recruitmentNote = note;
    setDirty(false);
    show('Recruitment priorities saved. The public Recruitment page will update immediately.', 'success');
  }

  async function ready(detail) {
    client = detail.client;

    try {
      specData = await loadSpecData();
    } catch {
      show('Could not load the class/spec recruitment catalogue.', 'error');
      return;
    }

    build();
    await load();
  }

  if (window.ODIT_OFFICER?.ready) {
    ready(window.ODIT_OFFICER);
  } else {
    window.addEventListener('odit:officer-ready', event => ready(event.detail), { once:true });
  }
})();
