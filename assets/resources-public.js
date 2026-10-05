(() => {
  const cfg=window.ODIT_SUPABASE||{};

  const defaultSections=[
    {
      id:"class",title:"Class Guides",layout:"cards",
      items:[
        {icon:"📖",title:"Class Guides",description:"Core class and spec references.",url:"https://www.wowhead.com/guides/classes"},
        {icon:"📈",title:"Raidbots",description:"Character simulation tools.",url:"https://www.raidbots.com/"},
        {icon:"👥",title:"Spec Mentors",description:"Guild help from appointed mentors.",url:"structure.html#roles"}
      ]
    },
    {
      id:"raid",title:"Raid Guides",layout:"cards",
      items:[
        {icon:"📊",title:"Warcraft Logs",description:"Raid reports, parses and progression.",url:"https://www.warcraftlogs.com/"},
        {icon:"⚔",title:"Encounter Guides",description:"Boss mechanics and raid references.",url:"https://www.wowhead.com/guides/raids"},
        {icon:"🏆",title:"ODit Progression",description:"Our goals, schedule and current progress.",url:"progression.html"}
      ]
    },
    {
      id:"mplus",title:"Mythic+ Guides",layout:"cards",
      items:[
        {icon:"🗝",title:"Raider.IO",description:"ODit guild profile and Mythic+ activity.",url:""},
        {icon:"🗺",title:"Routes & Profiles",description:"Mythic+ routes, pulls and planning.",url:"https://keystone.guru/"},
        {icon:"📅",title:"Mythic Mondays",description:"Our regular guild key night.",url:"progression.html#mythic"}
      ]
    },
    {id:"addons",title:"Addons & UI",layout:"cards",items:[]},
    {
      id:"external",title:"External Links",layout:"list",
      items:[
        {icon:"↗",title:"Wowhead",description:"Guides, items and game data.",url:"https://www.wowhead.com/"},
        {icon:"↗",title:"Raidbots",description:"Character simulation tools.",url:"https://www.raidbots.com/"},
        {icon:"↗",title:"Warcraft Logs",description:"Combat analysis.",url:"https://www.warcraftlogs.com/"}
      ]
    },
    {
      id:"community",title:"Community Tools",layout:"cards",
      items:[
        {icon:"💬",title:"Discord",description:"ODit community and recruitment contact.",url:""},
        {icon:"📆",title:"Calendars",description:"Raid and guild scheduling resources.",url:""},
        {icon:"🍻",title:"Shared Resources",description:"Guild documents, signups and tools.",url:""}
      ]
    }
  ];

  const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const safeUrl=(url='')=>{
    const value=String(url||'').trim();
    if(!value)return '';
    if(/^javascript:/i.test(value))return '';
    return value;
  };

  const normalisedRoot=(url='')=>
    String(url||'').trim().replace(/\/+$/,'').toLowerCase();

  const isGenericRaiderIo=(url='')=>{
    const value=normalisedRoot(url);
    return [
      'https://raider.io',
      'http://raider.io',
      'https://www.raider.io',
      'http://www.raider.io'
    ].includes(value);
  };

  const titleKey=(item)=>String(item?.title||'').trim().toLowerCase();

  /*
    Central ODit links:
    - Discord falls back to the Applicant Lounge invite in guild-config.js.
    - Raider.IO falls back to the ODit guild page when the Resources record is
      blank or still points only at the generic Raider.IO homepage.
    - Routes & Profiles uses Keystone.Guru when blank or still using the old
      generic Raider.IO placeholder.
    A genuinely specific URL entered later in Guild Management still wins.
  */
  const resolveUrl=(item)=>{
    const title=titleKey(item);
    const explicit=safeUrl(item?.url);

    if(title==='discord'){
      return explicit || safeUrl(window.ODIT_GUILD?.discordInvite);
    }

    if(title==='raider.io'){
      if(!explicit || isGenericRaiderIo(explicit)){
        return safeUrl(window.ODIT_GUILD?.raiderIO);
      }
      return explicit;
    }

    if(title==='routes & profiles'){
      if(!explicit || isGenericRaiderIo(explicit)){
        return 'https://keystone.guru/';
      }
      return explicit;
    }

    return explicit;
  };

  const renderCard=(item)=>{
    const url=resolveUrl(item);
    const external=/^https?:\/\//i.test(url);
    const tag=url?'a':'div';
    const attrs=url
      ? ` href="${esc(url)}"${external?' target="_blank" rel="noopener"':''}`
      : '';

    return `<${tag} class="resource-card"${attrs}>
      <div class="bigicon">${esc(item.icon||'🔗')}</div>
      <h3>${esc(item.title||'Resource')}</h3>
      <p>${esc(item.description||'')}</p>
    </${tag}>`;
  };

  const renderList=(item)=>{
    const url=resolveUrl(item);
    const external=/^https?:\/\//i.test(url);
    const tag=url?'a':'div';
    const attrs=url
      ? ` href="${esc(url)}"${external?' target="_blank" rel="noopener"':''}`
      : '';

    return `<${tag} class="resource"${attrs}>
      <div>
        <strong>${esc(item.title||'Resource')}</strong>
        <small>${esc(item.description||'')}</small>
      </div>
      <span class="arrow">${esc(item.icon||'→')}</span>
    </${tag}>`;
  };

  function render(sections){
    sections.forEach(section=>{
      const host=document.querySelector(
        `[data-resource-section="${CSS.escape(section.id)}"]`
      );
      if(!host)return;

      const items=Array.isArray(section.items)?section.items:[];
      if(!items.length){
        host.innerHTML='<div class="notice info">Resources for this section are being added.</div>';
        return;
      }

      if(section.layout==='list'){
        host.className='resource-list';
        host.innerHTML=items.map(renderList).join('');
      }else{
        host.className='resource-grid';
        host.innerHTML=items.map(renderCard).join('');
      }
    });
  }

  render(defaultSections);

  if(!window.supabase || !cfg.url || !cfg.key)return;

  const client=window.supabase.createClient(cfg.url,cfg.key);

  client
    .from('resource_settings')
    .select('sections')
    .eq('id',1)
    .maybeSingle()
    .then(({data,error})=>{
      if(error || !Array.isArray(data?.sections) || !data.sections.length)return;
      render(data.sections);
    });
})();
