(() => {
  const defaults = {
    'raid-leader':'Duckie',
    'tank-lead':'Duckie',
    'healer-lead':'Phae',
    'dps-lead':'To be appointed',
    'mplus-lead':'To be appointed',
    'recruit-lead':'Council interim',
    'community-lead':'Council interim'
  };

  const message = document.getElementById('structureMessage');
  const mentorsBox = document.getElementById('structureMentors');
  const addBtn = document.getElementById('addStructureMentor');
  const saveBtn = document.getElementById('saveGuildStructure');

  if (!message || !mentorsBox || !addBtn || !saveBtn) return;

  let client;
  let loaded = false;

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const show = (text, kind='info') => {
    message.hidden = false;
    message.className = `notice ${kind}`;
    message.textContent = text;
  };
  const hide = () => { message.hidden = true; };

  function addMentorRow(spec='', mentor='') {
    const row = document.createElement('div');
    row.className = 'mentor-admin-row';
    row.innerHTML = `
      <div class="field">
        <label>Class / spec</label>
        <input class="mentor-spec" maxlength="80" value="${esc(spec)}" placeholder="e.g. Retribution Paladin">
      </div>
      <div class="field">
        <label>Mentor</label>
        <input class="mentor-name" maxlength="80" value="${esc(mentor)}" placeholder="Character / player name">
      </div>
      <button class="btn danger remove-structure-mentor" type="button">Remove</button>
    `;
    row.querySelector('.remove-structure-mentor')?.addEventListener('click', () => row.remove());
    mentorsBox.appendChild(row);
  }

  async function load() {
    hide();

    const { data, error } = await client
      .from('guild_structure')
      .select('assignments,mentors,updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      show(`Could not load guild structure: ${error.message}`, 'error');
      return;
    }

    const assignments = { ...defaults, ...(data?.assignments || {}) };

    document.querySelectorAll('[data-structure-owner]').forEach(input => {
      input.value = assignments[input.dataset.structureOwner] || '';
    });

    mentorsBox.innerHTML = '';
    const mentors = Array.isArray(data?.mentors) ? data.mentors : [];
    mentors.forEach(m => addMentorRow(m?.spec || '', m?.mentor || ''));
    if (!mentors.length) addMentorRow('Retribution Paladin', 'Vacant');

    loaded = true;
  }

  async function save() {
    if (!loaded) return;

    const assignments = {};
    document.querySelectorAll('[data-structure-owner]').forEach(input => {
      assignments[input.dataset.structureOwner] = input.value.trim() || 'To be appointed';
    });

    const mentors = [...mentorsBox.querySelectorAll('.mentor-admin-row')]
      .map(row => ({
        spec: row.querySelector('.mentor-spec').value.trim(),
        mentor: row.querySelector('.mentor-name').value.trim()
      }))
      .filter(item => item.spec || item.mentor)
      .map(item => ({
        spec: item.spec || 'Class / spec',
        mentor: item.mentor || 'Vacant'
      }));

    saveBtn.disabled = true;
    const { error } = await client
      .from('guild_structure')
      .update({ assignments, mentors })
      .eq('id', 1);
    saveBtn.disabled = false;

    if (error) {
      show(error.message, 'error');
      return;
    }

    show('Guild structure saved.', 'success');
  }

  addBtn.addEventListener('click', () => addMentorRow());
  saveBtn.addEventListener('click', save);

  function ready(detail) {
    client = detail.client;
    load();
  }

  if (window.ODIT_OFFICER?.ready) ready(window.ODIT_OFFICER);
  else window.addEventListener('odit:officer-ready', e => ready(e.detail), { once:true });
})();