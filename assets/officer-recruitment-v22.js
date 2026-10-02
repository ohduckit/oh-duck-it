(() => {
  const cfg = window.ODIT_SUPABASE || {};
  if (!window.supabase || !cfg.url || !cfg.key) return;

  const appList = document.getElementById('appList');
  const detail = document.getElementById('detail');
  if (!appList || !detail) return;

  const client = window.supabase.createClient(cfg.url, cfg.key);
  let applicationMeta = new Map();
  let metaLoading = false;
  let selectedRequest = 0;
  let timer = null;

  const esc = (s='') =>
    String(s).replace(/[&<>'"]/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    }[c]));

  async function loadMeta() {
    if (metaLoading) return;
    metaLoading = true;

    const { data, error } = await client
      .from('applications')
      .select('id, faction, profession_1, profession_2, interests');

    metaLoading = false;
    if (error || !data) return;

    applicationMeta = new Map(data.map(row => [String(row.id), row]));
    decorateList();
    decorateSelected();
  }

  function decorateList() {
    appList.querySelectorAll('.app-item[data-id]').forEach(button => {
      const meta = applicationMeta.get(String(button.dataset.id));
      if (!meta?.faction) return;

      const small = button.querySelector('small');
      if (!small) return;

      const parts = small.textContent.split(' • ');
      if (parts.length >= 3) {
        // Existing officers.js renders: Realm • Preferred role • Submitted.
        // Replace the obsolete preferred role with the actually useful faction.
        small.textContent = `${parts[0]} • ${meta.faction} • ${parts.slice(2).join(' • ')}`;
      }
    });
  }

  async function decorateSelected() {
    const active = appList.querySelector('.app-item.active[data-id]');
    const grid = detail.querySelector('.detail-grid');
    if (!active || !grid) return;

    const id = String(active.dataset.id);
    let meta = applicationMeta.get(id);

    if (!meta) {
      const request = ++selectedRequest;
      const { data, error } = await client
        .from('applications')
        .select('id, faction, profession_1, profession_2, interests')
        .eq('id', id)
        .maybeSingle();

      if (request !== selectedRequest || error || !data) return;
      meta = data;
      applicationMeta.set(id, data);
    }

    // Replace the second detail badge (legacy preferred role) with faction.
    if (meta.faction) {
      const badges = detail.querySelectorAll('.badges .badge');
      if (badges.length >= 2) badges[1].textContent = meta.faction;
    }

    if (grid.querySelector(`[data-recruitment-extra="${CSS.escape(id)}"]`)) return;

    const professions = [meta.profession_1, meta.profession_2].filter(Boolean);
    const interests = Array.isArray(meta.interests) ? meta.interests : [];

    const block = document.createElement('div');
    block.dataset.recruitmentExtra = id;
    block.className = 'data full';
    block.innerHTML = `
      <span>Guild interests & professions</span>
      <p><b>Faction:</b> ${meta.faction ? esc(meta.faction) : '—'}<br>
      <b>Interests:</b> ${interests.length ? esc(interests.join(' • ')) : '—'}<br>
      <b>Professions:</b> ${professions.length ? esc(professions.join(' • ')) : '—'}</p>
    `;
    grid.prepend(block);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      decorateList();
      decorateSelected();
    }, 25);
  }

  const listObserver = new MutationObserver(schedule);
  listObserver.observe(appList, { subtree:true, childList:true, attributes:true, attributeFilter:['class'] });

  const detailObserver = new MutationObserver(schedule);
  detailObserver.observe(detail, { subtree:true, childList:true });

  appList.addEventListener('click', schedule);

  loadMeta();
})();
