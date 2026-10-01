(() => {
  const cfg = window.ODIT_SUPABASE || {};
  const configured = cfg.url && cfg.key && !cfg.url.startsWith('YOUR_') && !cfg.key.startsWith('YOUR_');
  const authView=document.getElementById('authView');
  const managementView=document.getElementById('managementView');
  const authNotice=document.getElementById('authNotice');
  const authText=document.getElementById('authText');
  const loginBtn=document.getElementById('discordLogin');
  const logoutBtnAuth=document.getElementById('logoutBtnAuth');
  const unauthorisedBox=document.getElementById('unauthorisedBox');
  const uidBox=document.getElementById('userUid');
  const structureMessage=document.getElementById('structureMessage');
  const structureMentors=document.getElementById('structureMentors');
  const addStructureMentorBtn=document.getElementById('addStructureMentor');
  const saveGuildStructureBtn=document.getElementById('saveGuildStructure');
  let client,user,structureLoaded=false;
  const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const show=(el,text,kind='info')=>{el.hidden=false;el.className=`notice ${kind}`;el.textContent=text;};
  const hide=el=>{el.hidden=true;};
  const metaName=u=>u?.user_metadata?.full_name||u?.user_metadata?.name||u?.user_metadata?.preferred_username||u?.email||'Officer';
  const defaults={'raid-leader':'Duckie','tank-lead':'Duckie','healer-lead':'Phae','dps-lead':'To be appointed','mplus-lead':'To be appointed','recruit-lead':'Council interim','community-lead':'Council interim'};

  if(!configured){loginBtn.disabled=true;show(authNotice,'Supabase is not configured.','error');return;}
  client=window.supabase.createClient(cfg.url,cfg.key);
  loginBtn.addEventListener('click',async()=>{const redirectTo=window.location.href.split('#')[0].split('?')[0];const{error}=await client.auth.signInWithOAuth({provider:'discord',options:{redirectTo}});if(error)show(authNotice,error.message,'error');});
  const signOut=async()=>{await client.auth.signOut();location.reload();};
  document.getElementById('logoutBtn').addEventListener('click',signOut);
  logoutBtnAuth.addEventListener('click',signOut);
  addStructureMentorBtn.addEventListener('click',()=>addMentorRow());
  saveGuildStructureBtn.addEventListener('click',saveGuildStructure);

  function addMentorRow(spec='',mentor=''){
    const row=document.createElement('div');row.className='mentor-admin-row';
    row.innerHTML=`<div class="field"><label>Class / spec</label><input class="mentor-spec" maxlength="80" value="${esc(spec)}" placeholder="e.g. Retribution Paladin"></div><div class="field"><label>Mentor</label><input class="mentor-name" maxlength="80" value="${esc(mentor)}" placeholder="Character / player name"></div><button class="btn danger remove-structure-mentor" type="button">Remove</button>`;
    row.querySelector('.remove-structure-mentor').addEventListener('click',()=>row.remove());structureMentors.appendChild(row);
  }

  async function loadGuildStructure(){
    hide(structureMessage);
    const{data,error}=await client.from('guild_structure').select('assignments,mentors,updated_at').eq('id',1).maybeSingle();
    if(error){show(structureMessage,`Could not load guild structure: ${error.message}`,'error');return;}
    const assignments={...defaults,...(data?.assignments||{})};
    document.querySelectorAll('[data-structure-owner]').forEach(input=>{input.value=assignments[input.dataset.structureOwner]||'';});
    structureMentors.innerHTML='';
    const mentors=Array.isArray(data?.mentors)?data.mentors:[];
    mentors.forEach(m=>addMentorRow(m?.spec||'',m?.mentor||''));
    if(!mentors.length)addMentorRow('Retribution Paladin','Vacant');
    structureLoaded=true;
  }

  async function saveGuildStructure(){
    if(!structureLoaded)return;
    const assignments={};
    document.querySelectorAll('[data-structure-owner]').forEach(input=>{assignments[input.dataset.structureOwner]=input.value.trim()||'To be appointed';});
    const mentors=[...structureMentors.querySelectorAll('.mentor-admin-row')].map(row=>({spec:row.querySelector('.mentor-spec').value.trim(),mentor:row.querySelector('.mentor-name').value.trim()})).filter(m=>m.spec||m.mentor).map(m=>({spec:m.spec||'Class / spec',mentor:m.mentor||'Vacant'}));
    saveGuildStructureBtn.disabled=true;
    const{error}=await client.from('guild_structure').update({assignments,mentors}).eq('id',1);
    saveGuildStructureBtn.disabled=false;
    if(error){show(structureMessage,error.message,'error');return;}
    show(structureMessage,'Guild structure saved.','success');
  }

  async function boot(){
    const{data:{session},error}=await client.auth.getSession();
    if(error){show(authNotice,error.message,'error');return;}
    user=session?.user||null;if(!user)return;
    loginBtn.hidden=true;logoutBtnAuth.hidden=false;authText.textContent=`Signed in as ${metaName(user)}. Checking officer access…`;
    const{data:isOfficer,error:officerError}=await client.rpc('is_officer');
    if(officerError){show(authNotice,'Could not verify officer access.','error');return;}
    if(!isOfficer){authText.textContent=`Signed in as ${metaName(user)}, but this account is not authorised.`;unauthorisedBox.hidden=false;uidBox.textContent=user.id;return;}
    authView.hidden=true;managementView.hidden=false;document.getElementById('officerIdentity').textContent=`Signed in as ${metaName(user)}.`;await loadGuildStructure();
  }
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')location.reload();});
  boot();
})();
