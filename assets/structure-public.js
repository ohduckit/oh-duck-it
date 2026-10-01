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
  if(!configured) return; // Defaults embedded in the page remain visible until Supabase is connected.

  const client=window.supabase.createClient(cfg.url,cfg.key);
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  async function loadStructure(){
    const {data,error}=await client.from('guild_structure').select('assignments,mentors').eq('id',1).maybeSingle();
    if(error||!data) return;
    const assignments=data.assignments||{};
    $$('[data-owner]').forEach(el=>{
      const value=assignments[el.dataset.owner];
      if(typeof value==='string'&&value.trim()) el.textContent=value.trim();
    });
    if(Array.isArray(data.mentors)){
      const list=$('#mentorList');
      list.innerHTML='';
      if(!data.mentors.length){
        list.innerHTML='<div class="note" style="grid-column:1/-1">No class/spec mentors are currently appointed.</div>';
      }else{
        data.mentors.forEach(m=>{
          const spec=(m&&m.spec)||'Class / spec';
          const mentor=(m&&m.mentor)||'Vacant';
          const d=document.createElement('div');
          d.className='mentor'; d.dataset.mentor='';
          d.innerHTML=`<strong>${esc(spec)}</strong><span>Mentor: ${esc(mentor)}</span>`;
          list.appendChild(d);
        });
      }
    }
  }
  loadStructure();
})();
