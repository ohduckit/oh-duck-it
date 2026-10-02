(() => {
  const cfg = window.ODIT_SUPABASE || {};
  const configured = cfg.url && cfg.key && !cfg.url.startsWith('YOUR_') && !cfg.key.startsWith('YOUR_');

  const authView = document.getElementById('authView');
  const managementView = document.getElementById('managementView');
  const authNotice = document.getElementById('authNotice');
  const authText = document.getElementById('authText');
  const loginBtn = document.getElementById('discordLogin');
  const logoutBtnAuth = document.getElementById('logoutBtnAuth');
  const unauthorisedBox = document.getElementById('unauthorisedBox');
  const uidBox = document.getElementById('userUid');

  const structureMessage = document.getElementById('structureMessage');
  const structureMentors = document.getElementById('structureMentors');
  const addStructureMentorBtn = document.getElementById('addStructureMentor');
  const saveGuildStructureBtn = document.getElementById('saveGuildStructure');

  const priorityRows = document.getElementById('recruitmentPriorityRows');
  const priorityMessage = document.getElementById('recruitmentPriorityMessage');
  const addPriorityBtn = document.getElementById('addRecruitmentPriority');
  const savePrioritiesBtn = document.getElementById('saveRecruitmentPriorities');

  const resourceRows = document.getElementById('resourceRows');
  const resourceMessage = document.getElementById('resourceMessage');
  const addResourceBtn = document.getElementById('addResourceItem');
  const saveResourcesBtn = document.getElementById('saveResources');
  const resourceSectionFilter = document.getElementById('resourceSectionFilter');

  let client, user;
  let structureLoaded = false;
  let prioritiesLoaded = false;
  let resourcesLoaded = false;
  let resourceSections = [];

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));
  const show = (el,text,kind='info') => {
    if (!el) return;
    el.hidden = false;
    el.className = `notice ${kind}`;
    el.textContent = text;
  };
  const hide = el => { if (el) el.hidden = true; };
  const metaName = u =>
    u?.user_metadata?.full_name ||
    u?.user_metadata?.name ||
    u?.user_metadata?.preferred_username ||
    u?.email ||
    'Officer';

  const defaults = {
    'raid-leader':'Duckie',
    'tank-lead':'Duckie',
    'healer-lead':'Phae',
    'dps-lead':'To be appointed',
    'mplus-lead':'To be appointed',
    'recruit-lead':'Council interim',
    'community-lead':'Council interim'
  };

  const defaultPriorities = [
    {icon:'🛡',label:'Tanks',status:'Open / depth'},
    {icon:'✚',label:'Healers',status:'High priority'},
    {icon:'⚔',label:'DPS',status:'Open'},
    {icon:'★',label:'All Roles',status:'Exceptional applicants welcome'}
  ];

  const priorityIcons = ['🛡','✚','⚔','★','🗝','👥','🏹','🔮'];

  const defaultResourceSections = [{"id": "class", "title": "Class Guides", "layout": "cards", "items": [{"icon": "📖", "title": "Class Guides", "description": "Core class and spec references.", "url": "https://www.wowhead.com/guides/classes"}, {"icon": "📈", "title": "Raidbots", "description": "Character simulation tools.", "url": "https://www.raidbots.com/"}, {"icon": "👥", "title": "Spec Mentors", "description": "Guild help from appointed mentors.", "url": "structure.html#roles"}]}, {"id": "raid", "title": "Raid Guides", "layout": "cards", "items": [{"icon": "📊", "title": "Warcraft Logs", "description": "Raid reports, parses and progression.", "url": "https://www.warcraftlogs.com/"}, {"icon": "⚔", "title": "Encounter Guides", "description": "Boss mechanics and raid references.", "url": "https://www.wowhead.com/guides/raids"}, {"icon": "🏆", "title": "ODit Progression", "description": "Our goals, schedule and current progress.", "url": "progression.html"}]}, {"id": "mplus", "title": "Mythic+ Guides", "layout": "cards", "items": [{"icon": "🗝", "title": "Raider.IO", "description": "Guild profile and Mythic+ activity.", "url": "https://raider.io/"}, {"icon": "🗺", "title": "Routes & Profiles", "description": "External Mythic+ resources.", "url": "https://raider.io/"}, {"icon": "📅", "title": "Mythic Mondays", "description": "Our regular guild key night.", "url": "progression.html#mythic"}]}, {"id": "addons", "title": "Addons & UI", "layout": "cards", "items": []}, {"id": "external", "title": "External Links", "layout": "list", "items": [{"icon": "↗", "title": "Wowhead", "description": "Guides, items and game data.", "url": "https://www.wowhead.com/"}, {"icon": "↗", "title": "Raidbots", "description": "Character simulation tools.", "url": "https://www.raidbots.com/"}, {"icon": "↗", "title": "Warcraft Logs", "description": "Combat analysis.", "url": "https://www.warcraftlogs.com/"}]}, {"id": "community", "title": "Community Tools", "layout": "cards", "items": [{"icon": "💬", "title": "Discord", "description": "ODit community and recruitment contact.", "url": ""}, {"icon": "📆", "title": "Calendars", "description": "Raid and guild scheduling resources.", "url": ""}, {"icon": "🍻", "title": "Shared Resources", "description": "Guild documents, signups and tools.", "url": ""}]}];

  if (!configured) {
    loginBtn.disabled = true;
    show(authNotice,'Supabase is not configured.','error');
    return;
  }

  client = window.supabase.createClient(cfg.url,cfg.key);

  loginBtn.addEventListener('click', async () => {
    const redirectTo = window.location.href.split('#')[0].split('?')[0];
    const {error} = await client.auth.signInWithOAuth({
      provider:'discord',
      options:{redirectTo}
    });
    if(error) show(authNotice,error.message,'error');
  });

  const signOut = async () => {
    await client.auth.signOut();
    location.reload();
  };

  document.getElementById('logoutBtn').addEventListener('click',signOut);
  logoutBtnAuth.addEventListener('click',signOut);
  addStructureMentorBtn.addEventListener('click',()=>addMentorRow());
  saveGuildStructureBtn.addEventListener('click',saveGuildStructure);
  addPriorityBtn?.addEventListener('click',()=>addPriorityRow());
  savePrioritiesBtn?.addEventListener('click',saveRecruitmentPriorities);
  addResourceBtn?.addEventListener('click',()=>addResourceRow());
  saveResourcesBtn?.addEventListener('click',saveResources);
  resourceSectionFilter?.addEventListener('change',renderResourceRows);

  function addMentorRow(spec='',mentor=''){
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
      <button class="btn danger remove-structure-mentor" type="button">Remove</button>`;
    row.querySelector('.remove-structure-mentor').addEventListener('click',()=>row.remove());
    structureMentors.appendChild(row);
  }

  async function loadGuildStructure(){
    hide(structureMessage);
    const {data,error} = await client
      .from('guild_structure')
      .select('assignments,mentors,updated_at')
      .eq('id',1)
      .maybeSingle();

    if(error){
      show(structureMessage,`Could not load guild structure: ${error.message}`,'error');
      return;
    }

    const assignments = {...defaults,...(data?.assignments||{})};
    document.querySelectorAll('[data-structure-owner]').forEach(input=>{
      input.value = assignments[input.dataset.structureOwner] || '';
    });

    structureMentors.innerHTML = '';
    const mentors = Array.isArray(data?.mentors) ? data.mentors : [];
    mentors.forEach(m=>addMentorRow(m?.spec||'',m?.mentor||''));
    if(!mentors.length) addMentorRow('Retribution Paladin','Vacant');

    structureLoaded = true;
  }

  async function saveGuildStructure(){
    if(!structureLoaded) return;

    const assignments = {};
    document.querySelectorAll('[data-structure-owner]').forEach(input=>{
      assignments[input.dataset.structureOwner] = input.value.trim() || 'To be appointed';
    });

    const mentors = [...structureMentors.querySelectorAll('.mentor-admin-row')]
      .map(row=>({
        spec:row.querySelector('.mentor-spec').value.trim(),
        mentor:row.querySelector('.mentor-name').value.trim()
      }))
      .filter(m=>m.spec||m.mentor)
      .map(m=>({
        spec:m.spec||'Class / spec',
        mentor:m.mentor||'Vacant'
      }));

    saveGuildStructureBtn.disabled = true;
    const {error} = await client
      .from('guild_structure')
      .update({assignments,mentors})
      .eq('id',1);
    saveGuildStructureBtn.disabled = false;

    if(error){
      show(structureMessage,error.message,'error');
      return;
    }

    show(structureMessage,'Guild structure saved.','success');
  }

  function addPriorityRow(item={icon:'★',label:'',status:''}){
    if(!priorityRows) return;

    const row = document.createElement('div');
    row.className = 'priority-admin-row';

    const iconOptions = priorityIcons.map(icon =>
      `<option value="${esc(icon)}" ${icon===item.icon?'selected':''}>${esc(icon)}</option>`
    ).join('');

    row.innerHTML = `
      <div class="field priority-icon-field">
        <label>Icon</label>
        <select class="priority-icon">${iconOptions}</select>
      </div>
      <div class="field">
        <label>Priority</label>
        <input class="priority-label" maxlength="60" value="${esc(item.label||'')}" placeholder="e.g. Ranged DPS">
      </div>
      <div class="field">
        <label>Public status / note</label>
        <input class="priority-status" maxlength="100" value="${esc(item.status||'')}" placeholder="e.g. High priority">
      </div>
      <div class="priority-row-controls">
        <button class="btn priority-up" type="button" title="Move up">↑</button>
        <button class="btn priority-down" type="button" title="Move down">↓</button>
        <button class="btn danger priority-remove" type="button">Remove</button>
      </div>`;

    row.querySelector('.priority-remove').addEventListener('click',()=>row.remove());

    row.querySelector('.priority-up').addEventListener('click',()=>{
      const prev = row.previousElementSibling;
      if(prev) priorityRows.insertBefore(row,prev);
    });

    row.querySelector('.priority-down').addEventListener('click',()=>{
      const next = row.nextElementSibling;
      if(next) priorityRows.insertBefore(next,row);
    });

    priorityRows.appendChild(row);
  }

  async function loadRecruitmentPriorities(){
    if(!priorityRows) return;

    hide(priorityMessage);
    priorityRows.innerHTML = '';

    const {data,error} = await client
      .from('recruitment_settings')
      .select('priorities,updated_at')
      .eq('id',1)
      .maybeSingle();

    if(error){
      defaultPriorities.forEach(addPriorityRow);
      show(
        priorityMessage,
        'Recruitment priorities are showing the defaults because the recruitment settings backend is not available yet. Run the supplied Supabase migration.',
        'info'
      );
      prioritiesLoaded = false;
      return;
    }

    const priorities =
      Array.isArray(data?.priorities) && data.priorities.length
        ? data.priorities
        : defaultPriorities;

    priorities.forEach(addPriorityRow);
    prioritiesLoaded = true;
  }

  async function saveRecruitmentPriorities(){
    if(!prioritiesLoaded || !priorityRows) return;

    const priorities = [...priorityRows.querySelectorAll('.priority-admin-row')]
      .map(row=>({
        icon:row.querySelector('.priority-icon').value || '★',
        label:row.querySelector('.priority-label').value.trim(),
        status:row.querySelector('.priority-status').value.trim()
      }))
      .filter(item=>item.label || item.status)
      .map(item=>({
        icon:item.icon,
        label:item.label || 'Priority',
        status:item.status || 'Open'
      }));

    if(!priorities.length){
      show(priorityMessage,'Add at least one recruitment priority before saving.','error');
      return;
    }

    savePrioritiesBtn.disabled = true;
    const {error} = await client
      .from('recruitment_settings')
      .update({priorities})
      .eq('id',1);
    savePrioritiesBtn.disabled = false;

    if(error){
      show(priorityMessage,`Could not save recruitment priorities: ${error.message}`,'error');
      return;
    }

    show(
      priorityMessage,
      'Recruitment priorities saved. The public Recruitment page will use the new list immediately.',
      'success'
    );
  }


  function currentResourceSection(){
    const id = resourceSectionFilter?.value || 'class';
    return resourceSections.find(section=>section.id===id) || null;
  }

  function addResourceRow(item={icon:'🔗',title:'',description:'',url:''}){
    const section = currentResourceSection();
    if(!section) return;

    section.items = Array.isArray(section.items) ? section.items : [];
    section.items.push({...item});
    renderResourceRows();
  }

  function renderResourceRows(){
    if(!resourceRows) return;
    resourceRows.innerHTML='';

    const section=currentResourceSection();
    if(!section) return;

    const items=Array.isArray(section.items) ? section.items : [];

    if(!items.length){
      const empty=document.createElement('div');
      empty.className='resource-admin-empty';
      empty.textContent='No resources in this section yet. Use “+ Add resource” to add the first one.';
      resourceRows.appendChild(empty);
      return;
    }

    items.forEach((item,index)=>{
      const row=document.createElement('div');
      row.className='resource-admin-row';
      row.dataset.index=String(index);

      row.innerHTML=`
        <div class="field resource-icon-field">
          <label>Icon</label>
          <input class="resource-icon" maxlength="12" value="${esc(item.icon||'🔗')}" placeholder="🔗">
        </div>
        <div class="field">
          <label>Title</label>
          <input class="resource-title" maxlength="80" value="${esc(item.title||'')}" placeholder="Resource name">
        </div>
        <div class="field">
          <label>Description</label>
          <input class="resource-description" maxlength="180" value="${esc(item.description||'')}" placeholder="Short public description">
        </div>
        <div class="field">
          <label>URL</label>
          <input class="resource-url" maxlength="500" value="${esc(item.url||'')}" placeholder="https://… or local page">
        </div>
        <div class="resource-row-controls">
          <button class="btn resource-up" type="button" title="Move up">↑</button>
          <button class="btn resource-down" type="button" title="Move down">↓</button>
          <button class="btn danger resource-remove" type="button">Remove</button>
        </div>`;

      const update=()=>{
        section.items[index]={
          icon:row.querySelector('.resource-icon').value.trim()||'🔗',
          title:row.querySelector('.resource-title').value.trim(),
          description:row.querySelector('.resource-description').value.trim(),
          url:row.querySelector('.resource-url').value.trim()
        };
      };

      row.querySelectorAll('input').forEach(input=>input.addEventListener('input',update));

      row.querySelector('.resource-remove').addEventListener('click',()=>{
        section.items.splice(index,1);
        renderResourceRows();
      });

      row.querySelector('.resource-up').addEventListener('click',()=>{
        update();
        if(index<=0)return;
        [section.items[index-1],section.items[index]]=[section.items[index],section.items[index-1]];
        renderResourceRows();
      });

      row.querySelector('.resource-down').addEventListener('click',()=>{
        update();
        if(index>=section.items.length-1)return;
        [section.items[index+1],section.items[index]]=[section.items[index],section.items[index+1]];
        renderResourceRows();
      });

      resourceRows.appendChild(row);
    });
  }

  function syncResourceRows(){
    const section=currentResourceSection();
    if(!section || !resourceRows)return;

    const rows=[...resourceRows.querySelectorAll('.resource-admin-row')];
    if(!rows.length)return;

    section.items=rows.map(row=>({
      icon:row.querySelector('.resource-icon').value.trim()||'🔗',
      title:row.querySelector('.resource-title').value.trim(),
      description:row.querySelector('.resource-description').value.trim(),
      url:row.querySelector('.resource-url').value.trim()
    }));
  }

  async function loadResources(){
    if(!resourceRows)return;
    hide(resourceMessage);

    const {data,error}=await client
      .from('resource_settings')
      .select('sections,updated_at')
      .eq('id',1)
      .maybeSingle();

    if(error){
      resourceSections=JSON.parse(JSON.stringify(defaultResourceSections));
      renderResourceRows();
      show(
        resourceMessage,
        'Resources are showing the built-in defaults because the resource_settings backend is not available yet. Run the supplied Supabase migration.',
        'info'
      );
      resourcesLoaded=false;
      return;
    }

    resourceSections=
      Array.isArray(data?.sections) && data.sections.length
        ? data.sections
        : JSON.parse(JSON.stringify(defaultResourceSections));

    resourcesLoaded=true;
    renderResourceRows();
  }

  async function saveResources(){
    if(!resourcesLoaded)return;

    syncResourceRows();

    const cleaned=resourceSections.map(section=>({
      id:section.id,
      title:section.title,
      layout:section.layout==='list'?'list':'cards',
      items:(Array.isArray(section.items)?section.items:[])
        .map(item=>({
          icon:String(item.icon||'🔗').trim()||'🔗',
          title:String(item.title||'').trim(),
          description:String(item.description||'').trim(),
          url:String(item.url||'').trim()
        }))
        .filter(item=>item.title)
    }));

    saveResourcesBtn.disabled=true;
    const {error}=await client
      .from('resource_settings')
      .update({sections:cleaned})
      .eq('id',1);
    saveResourcesBtn.disabled=false;

    if(error){
      show(resourceMessage,`Could not save Resources page: ${error.message}`,'error');
      return;
    }

    resourceSections=cleaned;
    show(resourceMessage,'Resources page saved. Public resources will use the new content immediately.','success');
  }

  async function boot(){
    const {data:{session},error} = await client.auth.getSession();
    if(error){
      show(authNotice,error.message,'error');
      return;
    }

    user = session?.user || null;
    if(!user) return;

    loginBtn.hidden = true;
    logoutBtnAuth.hidden = false;
    authText.textContent = `Signed in as ${metaName(user)}. Checking officer access…`;

    const {data:isOfficer,error:officerError} = await client.rpc('is_officer');
    if(officerError){
      show(authNotice,'Could not verify officer access.','error');
      return;
    }

    if(!isOfficer){
      authText.textContent = `Signed in as ${metaName(user)}, but this account is not authorised.`;
      unauthorisedBox.hidden = false;
      uidBox.textContent = user.id;
      return;
    }

    authView.hidden = true;
    managementView.hidden = false;
    document.getElementById('officerIdentity').textContent = `Signed in as ${metaName(user)}.`;

    await loadGuildStructure();
    await loadRecruitmentPriorities();
    await loadResources();
  }

  client.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT') location.reload();
  });

  boot();
})();