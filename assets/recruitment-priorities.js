(() => {
  const list = document.querySelector('#looking .priority-list');
  const cfg = window.ODIT_SUPABASE || {};

  if(!list || !window.supabase || !cfg.url || !cfg.key) return;

  const fallback = list.innerHTML;
  const client = window.supabase.createClient(cfg.url,cfg.key);

  const esc = (s='') => String(s).replace(/[&<>'"]/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  async function load(){
    const {data,error} = await client
      .from('recruitment_settings')
      .select('priorities')
      .eq('id',1)
      .maybeSingle();

    if(error || !Array.isArray(data?.priorities) || !data.priorities.length){
      list.innerHTML = fallback;
      return;
    }

    list.innerHTML = data.priorities.map(item=>`
      <div class="priority">
        <span class="round">${esc(item?.icon||'★')}</span>
        <div>
          <b>${esc(item?.label||'Priority')}</b>
          <small>${esc(item?.status||'Open')}</small>
        </div>
      </div>
    `).join('');
  }

  load();
})();