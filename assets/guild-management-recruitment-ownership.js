(() => {
  const message = document.getElementById('recruitmentOwnershipMessage');
  const saveBtn = document.getElementById('saveRecruitmentOwnership');
  if (!message || !saveBtn) return;

  let client;
  let loaded = false;

  const esc = (value='') => String(value).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const show = (text, kind='info') => {
    message.hidden = false;
    message.className = `notice ${kind}`;
    message.textContent = text;
  };

  async function load() {
    const [
      { data: officerRows, error: officerError },
      { data: rules, error: rulesError }
    ] = await Promise.all([
      client.rpc('list_active_officers'),
      client.from('recruitment_assignment_rules').select('role_key,officer_user_id,updated_at')
    ]);

    if (officerError) {
      show(`Could not load active officers: ${officerError.message}`, 'error');
      return;
    }

    if (rulesError) {
      show('Recruitment ownership is not available yet. Run the Recruitment Auto Assignment migration first.', 'error');
      return;
    }

    const officers = officerRows || [];
    const byRole = new Map((rules || []).map(row => [row.role_key, row.officer_user_id || '']));

    document.querySelectorAll('[data-recruit-owner]').forEach(select => {
      const current = byRole.get(select.dataset.recruitOwner) || '';
      select.innerHTML = '<option value="">Unassigned</option>' + officers.map(o =>
        `<option value="${esc(o.user_id)}" ${o.user_id === current ? 'selected' : ''}>${esc(o.display_name)}</option>`
      ).join('');
    });

    loaded = true;
  }

  async function save() {
    if (!loaded) return;

    saveBtn.disabled = true;
    try {
      for (const select of document.querySelectorAll('[data-recruit-owner]')) {
        const officerId = select.value || null;
        const { error } = await client
          .from('recruitment_assignment_rules')
          .update({ officer_user_id: officerId, updated_at: new Date().toISOString() })
          .eq('role_key', select.dataset.recruitOwner);

        if (error) throw error;
      }

      show(
        'Recruitment ownership saved. New applications will route automatically, and Trial will hand over to the Raid Lead.',
        'success'
      );
    } catch (err) {
      show(`Could not save recruitment ownership: ${err?.message || err}`, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  }

  saveBtn.addEventListener('click', save);

  function ready(detail) {
    client = detail.client;
    load();
  }

  if (window.ODIT_MANAGEMENT?.ready) ready(window.ODIT_MANAGEMENT);
  else window.addEventListener('odit:management-ready', e => ready(e.detail), { once:true });
})();