(() => {
  const cfg = window.ODIT_SUPABASE || {};
  if (!window.supabase || !cfg.url || !cfg.key) return;

  const appList = document.getElementById('appList');
  const detail = document.getElementById('detail');
  if (!appList || !detail) return;

  const client = window.supabase.createClient(cfg.url, cfg.key);
  let requestId = 0;
  let scheduled = false;

  const esc = (s='') =>
    String(s).replace(/[&<>'"]/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    }[c]));

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      enhanceSelected();
    }, 0);
  }

  async function enhanceSelected() {
    const active = appList.querySelector('.app-item.active');
    const grid = detail.querySelector('.detail-grid');

    if (!active || !grid) return;

    const id = active.dataset.id;
    if (!id) return;

    if (grid.querySelector(`[data-recruitment-extra="${CSS.escape(id)}"]`)) return;

    const thisRequest = ++requestId;

    const { data, error } = await client
      .from('applications')
      .select('id, profession_1, profession_2, interests')
      .eq('id', id)
      .maybeSingle();

    if (thisRequest !== requestId || error || !data) return;

    const stillActive = appList.querySelector('.app-item.active');
    const currentGrid = detail.querySelector('.detail-grid');
    if (!stillActive || stillActive.dataset.id !== id || !currentGrid) return;

    const professions = [data.profession_1, data.profession_2].filter(Boolean);
    const interests = Array.isArray(data.interests) ? data.interests : [];

    const block = document.createElement('div');
    block.dataset.recruitmentExtra = id;
    block.className = 'data full';
    block.innerHTML = `
      <span>Guild interests & professions</span>
      <p><b>Interests:</b> ${interests.length ? esc(interests.join(' • ')) : '—'}<br>
      <b>Professions:</b> ${professions.length ? esc(professions.join(' • ')) : '—'}</p>
    `;

    currentGrid.prepend(block);
  }

  appList.addEventListener('click', scheduleEnhance);

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(appList, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  observer.observe(detail, {subtree:true, childList:true});

  scheduleEnhance();
})();
