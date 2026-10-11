(() => {
  const cfg = window.ODIT_SUPABASE || {};
  const looking = document.getElementById('looking');
  if (!looking) return;

  const cssHref = 'assets/recruitment-spec-priorities.css';
  if (![...document.styleSheets].some(s => s.href?.endsWith(cssHref))) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.appendChild(link);
  }

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const priorityLabel = priority =>
    ({ high:'High', medium:'Medium', low:'Low', closed:'Closed' }[priority] || 'Closed');

  function arrangeRecruitmentPage() {
    const overview = document.getElementById('overview');
    const looking = document.getElementById('looking');
    const philosophy = document.getElementById('philosophy');
    const trial = document.getElementById('trial');
    const faq = document.getElementById('faq');

    if (!overview || !looking || !philosophy || !trial || !faq) return;

    overview.classList.add('recruit-overview-v22');

    let left = overview.querySelector(':scope > .recruit-info-stack');
    if (!left) {
      left = document.createElement('div');
      left.className = 'recruit-info-stack';

      const intro = [...overview.children].find(el =>
        el.classList?.contains('parchment') && el.id !== 'looking'
      );

      overview.insertBefore(left, looking);

      if (intro) {
        left.appendChild(intro);
      }
    }

    // These sections must live in the left stack, directly under Join Oh Duck It.
    // Re-appending is intentional: it makes the layout self-healing if an older
    // cached layout or another script has left them elsewhere in the page.
    [philosophy, trial, faq].forEach(section => left.appendChild(section));

    // Recruitment is always the right-hand column.
    if (looking.parentElement !== overview) {
      overview.appendChild(looking);
    }

    const lookingLink = document.querySelector('.side-nav a[href="#looking"]');
    if (lookingLink) {
      lookingLink.innerHTML = '<span class="ico">◎</span>Current Recruitment';
    }
  }

  // Run immediately and once again after the browser has completed its first
  // layout pass. This avoids any stale DOM ordering from the previous layout.
  arrangeRecruitmentPage();
  requestAnimationFrame(arrangeRecruitmentPage);

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

  function allSpecs(data) {
    return data.classes.flatMap(cls =>
      cls.specs.map(spec => ({
        ...spec,
        className:cls.name,
        classColor:cls.color,
        key:`${cls.name}|${spec.name}`
      }))
    );
  }

  function ensureApplicationFit(priorityMap, exceptionalOpen) {
    const mainSpec = document.getElementById('main_spec');
    const classSelect = document.getElementById('class_name');
    const applyingField = mainSpec?.closest('.applying-as-field');
    if (!mainSpec || !classSelect || !applyingField) return;

    let box = document.getElementById('recruitmentSpecFit');
    if (!box) {
      box = document.createElement('div');
      box.id = 'recruitmentSpecFit';
      box.className = 'recruit-fit';
      box.hidden = true;
      applyingField.insertAdjacentElement('afterend', box);
    }

    let previous = '';

    const update = () => {
      const className = String(classSelect.value || '').trim();
      const spec = String(mainSpec.value || '').trim();
      const signature = `${className}|${spec}`;

      if (signature === previous) return;
      previous = signature;

      if (!className || !spec) {
        box.hidden = true;
        return;
      }

      const priority = priorityMap[signature] || 'closed';
      box.className = `recruit-fit ${priority}`;
      box.hidden = false;

      if (priority === 'closed') {
        box.innerHTML = exceptionalOpen
          ? `<strong>${esc(spec)} ${esc(className)}</strong> is not a current recruitment priority. Exceptional applicants are still welcome to apply.`
          : `<strong>${esc(spec)} ${esc(className)}</strong> is not currently being recruited.`;
      } else {
        box.innerHTML =
          `<strong>${esc(spec)} ${esc(className)}</strong> is currently a ` +
          `<span class="recruit-priority-pill ${priority}">${priorityLabel(priority)} priority</span> recruitment target.`;
      }
    };

    mainSpec.addEventListener('change', () => { previous=''; update(); });
    classSelect.addEventListener('change', () => { previous=''; update(); });

    // Battle.net fills these fields programmatically, so also watch for a changed
    // class/spec pair without requiring the recruitment form code to know about this module.
    window.setInterval(update, 500);
    update();
  }

  function renderBoard(data, settings) {
    const priorities = {
      ...(data.defaults || {}),
      ...(settings?.spec_priorities || {})
    };

    const items = allSpecs(data)
      .map(spec => ({ ...spec, priority: priorities[spec.key] || 'closed' }))
      .filter(spec => spec.priority !== 'closed');

    // Public recruitment is class-led, not role-led.
    // Sort classes by their strongest current recruitment need, then by the
    // number of higher-priority specs they contain. Within each class, specs
    // are sorted High -> Medium -> Low.
    const priorityWeight = { high:3, medium:2, low:1, closed:0 };

    const byClass = new Map();

    items.forEach(item => {
      if (!byClass.has(item.className)) {
        byClass.set(item.className, {
          className:item.className,
          classColor:item.classColor,
          specs:[]
        });
      }
      byClass.get(item.className).specs.push(item);
    });

    const classGroups = [...byClass.values()].map(group => {
      group.specs.sort((a,b) =>
        priorityWeight[b.priority] - priorityWeight[a.priority] ||
        a.name.localeCompare(b.name)
      );

      group.maxPriority = Math.max(
        ...group.specs.map(spec => priorityWeight[spec.priority] || 0)
      );
      group.highCount = group.specs.filter(spec => spec.priority === 'high').length;
      group.mediumCount = group.specs.filter(spec => spec.priority === 'medium').length;
      group.lowCount = group.specs.filter(spec => spec.priority === 'low').length;

      return group;
    }).sort((a,b) =>
      b.maxPriority - a.maxPriority ||
      b.highCount - a.highCount ||
      b.mediumCount - a.mediumCount ||
      b.lowCount - a.lowCount ||
      a.className.localeCompare(b.className)
    );

    const sections = `
      <section class="recruit-priority-class-section">
        <div class="recruit-priority-class-list">
          ${classGroups.map(group => `
            <article class="recruit-class-public" style="--class-color:${esc(group.classColor)}">
              <div class="recruit-class-public-name">${esc(group.className)}</div>

              <div class="recruit-class-spec-list">
                ${group.specs.map(item => `
                  <div
                    class="recruit-spec-chip ${esc(item.priority)}"
                    title="${esc(item.name)} — ${priorityLabel(item.priority)} priority"
                    aria-label="${esc(item.name)} — ${priorityLabel(item.priority)} priority"
                  >
                    <img src="${esc(item.icon)}" alt="" loading="lazy">
                    <span class="recruit-spec-chip-name">${esc(item.name)}</span>
                    <span class="recruit-priority-pill ${esc(item.priority)}">${priorityLabel(item.priority)}</span>
                  </div>
                `).join('')}
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;

    const high = items.filter(i => i.priority === 'high').length;
    const medium = items.filter(i => i.priority === 'medium').length;
    const low = items.filter(i => i.priority === 'low').length;

    looking.className = 'parchment recruit-spec-board';
    looking.innerHTML = `
      <div class="recruit-board-head">
        <div>
          <h3>Current Recruitment</h3>
          <p class="recruit-board-note">
            ${esc(settings?.recruitment_note || 'Current class and specialisation recruitment priorities.')}
          </p>
        </div>
        <div class="recruit-board-legend" aria-label="Recruitment priority legend">
          ${high ? `<span class="recruit-priority-pill high">${high} High</span>` : ''}
          ${medium ? `<span class="recruit-priority-pill medium">${medium} Medium</span>` : ''}
          ${low ? `<span class="recruit-priority-pill low">${low} Low</span>` : ''}
        </div>
      </div>

      <div class="recruit-role-sections">
        ${items.length
          ? sections
          : '<div class="recruit-no-openings">No specific class/spec priorities are currently listed.</div>'}
      </div>

      ${settings?.exceptional_open !== false ? `
        <div class="recruit-exceptional">
          <b>Not listed?</b> Exceptional applicants are still welcome to apply.
        </div>
      ` : ''}
    `;

    ensureApplicationFit(priorities, settings?.exceptional_open !== false);
    arrangeRecruitmentPage();
  }

  function fallbackLegacy() {
    // Keep the existing HTML untouched when v2 is not deployed yet.
  }

  async function init() {
    let specData;
    try {
      specData = await loadSpecData();
    } catch {
      fallbackLegacy();
      return;
    }

    if (!window.supabase || !cfg.url || !cfg.key) {
      renderBoard(specData, {
        spec_priorities:specData.defaults,
        exceptional_open:true,
        recruitment_note:'Our current focus is strengthening and balancing the DPS roster.'
      });
      return;
    }

    const client = window.supabase.createClient(cfg.url, cfg.key);
    const { data, error } = await client
      .from('recruitment_settings')
      .select('spec_priorities,exceptional_open,recruitment_note')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data || !data.spec_priorities) {
      fallbackLegacy();
      return;
    }

    renderBoard(specData, data);
  }

  init();
})();
