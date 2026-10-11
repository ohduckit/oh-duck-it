(() => {
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

  $$('.role').forEach(card=>card.addEventListener('click',()=>card.classList.toggle('open')));
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>{
    document.getElementById(b.dataset.go)?.scrollIntoView({behavior:'smooth'});
    $$('[data-go]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
  }));
  $('#expandBtn')?.addEventListener('click',()=>{
    const roles=$$('.role'),all=roles.every(x=>x.classList.contains('open'));
    roles.forEach(x=>x.classList.toggle('open',!all));
    $('#expandBtn').textContent=all?'Expand all':'Collapse all';
  });

  const cfg=window.ODIT_SUPABASE||{};
  const configured=cfg.url&&cfg.key&&!cfg.url.startsWith('YOUR_')&&!cfg.key.startsWith('YOUR_')&&window.supabase;

  const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  function setUnavailable() {
    $$('[data-owner]').forEach(el=>{ el.textContent='Unavailable'; });
    const list=$('#mentorList');
    if(list) list.innerHTML='<div class="note" style="grid-column:1/-1">Mentor information is temporarily unavailable.</div>';
  }

  function render(assignments={}, mentors=[]) {
    // Backward-compatible data migration: old dps-lead becomes Melee DPS Lead
    // until the officer saves the two new fields.
    const legacyDps =
      typeof assignments['dps-lead']==='string' && assignments['dps-lead'].trim()
        ? assignments['dps-lead'].trim()
        : '';

    const resolved = {
      ...assignments,
      'melee-dps-lead':
        (assignments['melee-dps-lead'] || legacyDps || 'To be appointed'),
      'ranged-dps-lead':
        (assignments['ranged-dps-lead'] || 'To be appointed')
    };

    $$('[data-owner]').forEach(el=>{
      const value=resolved[el.dataset.owner];
      el.textContent=
        typeof value==='string' && value.trim()
          ? value.trim()
          : 'To be appointed';
    });

    const list=$('#mentorList');
    if(!list) return;

    list.innerHTML='';
    if(!Array.isArray(mentors) || !mentors.length){
      list.innerHTML='<div class="note" style="grid-column:1/-1">No class/spec mentors are currently appointed.</div>';
      return;
    }

    mentors.forEach(m=>{
      const spec=(m&&m.spec)||'Class / spec';
      const mentor=(m&&m.mentor)||'Vacant';
      const d=document.createElement('div');
      d.className='mentor';
      d.dataset.mentor='';
      d.innerHTML=`<strong>${esc(spec)}</strong><span>Mentor: ${esc(mentor)}</span>`;
      list.appendChild(d);
    });
  }

  if(!configured){
    setUnavailable();
    return;
  }

  const client=window.supabase.createClient(cfg.url,cfg.key);

  async function loadStructure(){
    const {data,error}=await client
      .from('guild_structure')
      .select('assignments,mentors')
      .eq('id',1)
      .maybeSingle();

    if(error || !data){
      setUnavailable();
      return;
    }

    render(data.assignments||{}, data.mentors||[]);
  }

  loadStructure();
})();
