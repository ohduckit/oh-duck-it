(() => {
  const rows = document.getElementById('recruitmentPriorityRows');
  const message = document.getElementById('recruitmentPriorityMessage');
  const addBtn = document.getElementById('addRecruitmentPriority');
  const saveBtn = document.getElementById('saveRecruitmentPriorities');
  if (!rows || !message || !addBtn || !saveBtn) return;

  let client;
  let loaded = false;

  const defaults = [
    {icon:'🛡',label:'Tanks',status:'Open / depth'},
    {icon:'✚',label:'Healers',status:'High priority'},
    {icon:'⚔',label:'DPS',status:'Open'},
    {icon:'★',label:'All Roles',status:'Exceptional applicants welcome'}
  ];
  const icons = ['🛡','✚','⚔','★','🗝','👥','🏹','🔮'];

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const show = (text, kind='info') => {
    message.hidden = false;
    message.className = `notice ${kind}`;
    message.textContent = text;
  };
  const hide = () => { message.hidden = true; };

  function addRow(item={icon:'★',label:'',status:''}) {
    const row = document.createElement('div');
    row.className = 'priority-admin-row';

    const iconOptions = icons.map(icon =>
      `<option value="${esc(icon)}" ${icon === item.icon ? 'selected' : ''}>${esc(icon)}</option>`
    ).join('');

    row.innerHTML = `
      <div class="field priority-icon-field">
        <label>Icon</label>
        <select class="priority-icon">${iconOptions}</select>
      </div>
      <div class="field">
        <label>Priority</label>
        <input class="priority-label" maxlength="60" value="${esc(item.label || '')}" placeholder="e.g. Ranged DPS">
      </div>
      <div class="field">
        <label>Public status / note</label>
        <input class="priority-status" maxlength="100" value="${esc(item.status || '')}" placeholder="e.g. High priority">
      </div>
      <div class="priority-row-controls">
        <button class="btn priority-up" type="button" title="Move up">↑</button>
        <button class="btn priority-down" type="button" title="Move down">↓</button>
        <button class="btn danger priority-remove" type="button">Remove</button>
      </div>
    `;

    row.querySelector('.priority-remove')?.addEventListener('click', () => row.remove());
    row.querySelector('.priority-up')?.addEventListener('click', () => {
      const prev = row.previousElementSibling;
      if (prev) rows.insertBefore(row, prev);
    });
    row.querySelector('.priority-down')?.addEventListener('click', () => {
      const next = row.nextElementSibling;
      if (next) rows.insertBefore(next, row);
    });

    rows.appendChild(row);
  }

  async function load() {
    hide();
    rows.innerHTML = '';

    const { data, error } = await client
      .from('recruitment_settings')
      .select('priorities,updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      defaults.forEach(addRow);
      show(
        'Recruitment priorities are showing the defaults because the recruitment settings backend is not available.',
        'info'
      );
      loaded = false;
      return;
    }

    const priorities = Array.isArray(data?.priorities) && data.priorities.length
      ? data.priorities
      : defaults;

    priorities.forEach(addRow);
    loaded = true;
  }

  async function save() {
    if (!loaded) return;

    const priorities = [...rows.querySelectorAll('.priority-admin-row')]
      .map(row => ({
        icon: row.querySelector('.priority-icon').value || '★',
        label: row.querySelector('.priority-label').value.trim(),
        status: row.querySelector('.priority-status').value.trim()
      }))
      .filter(item => item.label || item.status)
      .map(item => ({
        icon: item.icon,
        label: item.label || 'Priority',
        status: item.status || 'Open'
      }));

    if (!priorities.length) {
      show('Add at least one recruitment priority before saving.', 'error');
      return;
    }

    saveBtn.disabled = true;
    const { error } = await client
      .from('recruitment_settings')
      .update({ priorities })
      .eq('id', 1);
    saveBtn.disabled = false;

    if (error) {
      show(`Could not save recruitment priorities: ${error.message}`, 'error');
      return;
    }

    show('Recruitment priorities saved. The public Recruitment page will use the new list immediately.', 'success');
  }

  addBtn.addEventListener('click', () => addRow());
  saveBtn.addEventListener('click', save);

  function ready(detail) {
    client = detail.client;
    load();
  }

  if (window.ODIT_MANAGEMENT?.ready) ready(window.ODIT_MANAGEMENT);
  else window.addEventListener('odit:management-ready', e => ready(e.detail), { once:true });
})();