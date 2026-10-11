(() => {
  const rows = document.getElementById('resourceRows');
  const message = document.getElementById('resourceMessage');
  const addBtn = document.getElementById('addResourceItem');
  const saveBtn = document.getElementById('saveResources');
  const sectionFilter = document.getElementById('resourceSectionFilter');

  if (!rows || !message || !addBtn || !saveBtn || !sectionFilter) return;

  let client;
  let loaded = false;
  let sections = [];

  const DEFAULTS = [
    {id:'class',title:'Class Guides',layout:'cards',items:[
      {icon:'📖',title:'Class Guides',description:'Core class and spec references.',url:'https://www.wowhead.com/guides/classes'},
      {icon:'📈',title:'Raidbots',description:'Character simulation tools.',url:'https://www.raidbots.com/'},
      {icon:'👥',title:'Spec Mentors',description:'Guild help from appointed mentors.',url:'structure.html#roles'}
    ]},
    {id:'raid',title:'Raid Guides',layout:'cards',items:[
      {icon:'📊',title:'Warcraft Logs',description:'Raid reports, parses and progression.',url:'https://www.warcraftlogs.com/'},
      {icon:'⚔',title:'Encounter Guides',description:'Boss mechanics and raid references.',url:'https://www.wowhead.com/guides/raids'},
      {icon:'🏆',title:'ODit Progression',description:'Our goals, schedule and current progress.',url:'progression.html'}
    ]},
    {id:'mplus',title:'Mythic+ Guides',layout:'cards',items:[
      {icon:'🗝',title:'Raider.IO',description:'Guild profile and Mythic+ activity.',url:'https://raider.io/'},
      {icon:'🗺',title:'Routes & Profiles',description:'External Mythic+ resources.',url:'https://raider.io/'},
      {icon:'📅',title:'Mythic Mondays',description:'Our regular guild key night.',url:'progression.html#mythic'}
    ]},
    {id:'addons',title:'Addons & UI',layout:'cards',items:[]},
    {id:'external',title:'External Links',layout:'list',items:[
      {icon:'↗',title:'Wowhead',description:'Guides, items and game data.',url:'https://www.wowhead.com/'},
      {icon:'↗',title:'Raidbots',description:'Character simulation tools.',url:'https://www.raidbots.com/'},
      {icon:'↗',title:'Warcraft Logs',description:'Combat analysis.',url:'https://www.warcraftlogs.com/'}
    ]},
    {id:'community',title:'Community Tools',layout:'cards',items:[
      {icon:'💬',title:'Discord',description:'ODit community and recruitment contact.',url:''},
      {icon:'📆',title:'Calendars',description:'Raid and guild scheduling resources.',url:''},
      {icon:'🍻',title:'Shared Resources',description:'Guild documents, signups and tools.',url:''}
    ]}
  ];

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const show = (text, kind='info') => {
    message.hidden = false;
    message.className = `notice ${kind}`;
    message.textContent = text;
  };
  const hide = () => { message.hidden = true; };

  const currentSection = () =>
    sections.find(section => section.id === sectionFilter.value) || null;

  function addRow(item={icon:'🔗',title:'',description:'',url:''}) {
    const section = currentSection();
    if (!section) return;
    section.items = Array.isArray(section.items) ? section.items : [];
    section.items.push({ ...item });
    renderRows();
  }

  function renderRows() {
    rows.innerHTML = '';
    const section = currentSection();
    if (!section) return;

    const items = Array.isArray(section.items) ? section.items : [];

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'resource-admin-empty';
      empty.textContent = 'No resources in this section yet. Use “+ Add resource” to add the first one.';
      rows.appendChild(empty);
      return;
    }

    items.forEach((item,index) => {
      const row = document.createElement('div');
      row.className = 'resource-admin-row';
      row.dataset.index = String(index);

      row.innerHTML = `
        <div class="field resource-icon-field">
          <label>Icon</label>
          <input class="resource-icon" maxlength="12" value="${esc(item.icon || '🔗')}" placeholder="🔗">
        </div>
        <div class="field">
          <label>Title</label>
          <input class="resource-title" maxlength="80" value="${esc(item.title || '')}" placeholder="Resource name">
        </div>
        <div class="field">
          <label>Description</label>
          <input class="resource-description" maxlength="180" value="${esc(item.description || '')}" placeholder="Short public description">
        </div>
        <div class="field">
          <label>URL</label>
          <input class="resource-url" maxlength="500" value="${esc(item.url || '')}" placeholder="https://… or local page">
        </div>
        <div class="resource-row-controls">
          <button class="btn resource-up" type="button" title="Move up">↑</button>
          <button class="btn resource-down" type="button" title="Move down">↓</button>
          <button class="btn danger resource-remove" type="button">Remove</button>
        </div>
      `;

      const update = () => {
        section.items[index] = {
          icon: row.querySelector('.resource-icon').value.trim() || '🔗',
          title: row.querySelector('.resource-title').value.trim(),
          description: row.querySelector('.resource-description').value.trim(),
          url: row.querySelector('.resource-url').value.trim()
        };
      };

      row.querySelectorAll('input').forEach(input => input.addEventListener('input', update));
      row.querySelector('.resource-remove')?.addEventListener('click', () => {
        section.items.splice(index, 1);
        renderRows();
      });
      row.querySelector('.resource-up')?.addEventListener('click', () => {
        update();
        if (index <= 0) return;
        [section.items[index-1], section.items[index]] = [section.items[index], section.items[index-1]];
        renderRows();
      });
      row.querySelector('.resource-down')?.addEventListener('click', () => {
        update();
        if (index >= section.items.length - 1) return;
        [section.items[index+1], section.items[index]] = [section.items[index], section.items[index+1]];
        renderRows();
      });

      rows.appendChild(row);
    });
  }

  function syncRows() {
    const section = currentSection();
    if (!section) return;

    const currentRows = [...rows.querySelectorAll('.resource-admin-row')];
    if (!currentRows.length) return;

    section.items = currentRows.map(row => ({
      icon: row.querySelector('.resource-icon').value.trim() || '🔗',
      title: row.querySelector('.resource-title').value.trim(),
      description: row.querySelector('.resource-description').value.trim(),
      url: row.querySelector('.resource-url').value.trim()
    }));
  }

  async function load() {
    hide();

    const { data, error } = await client
      .from('resource_settings')
      .select('sections,updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      sections = JSON.parse(JSON.stringify(DEFAULTS));
      renderRows();
      show('Resources are showing built-in defaults because the resource_settings backend is not available.', 'info');
      loaded = false;
      return;
    }

    sections = Array.isArray(data?.sections) && data.sections.length
      ? data.sections
      : JSON.parse(JSON.stringify(DEFAULTS));

    loaded = true;
    renderRows();
  }

  async function save() {
    if (!loaded) return;
    syncRows();

    const cleaned = sections.map(section => ({
      id: section.id,
      title: section.title,
      layout: section.layout === 'list' ? 'list' : 'cards',
      items: (Array.isArray(section.items) ? section.items : [])
        .map(item => ({
          icon: String(item.icon || '🔗').trim() || '🔗',
          title: String(item.title || '').trim(),
          description: String(item.description || '').trim(),
          url: String(item.url || '').trim()
        }))
        .filter(item => item.title)
    }));

    saveBtn.disabled = true;
    const { error } = await client
      .from('resource_settings')
      .update({ sections: cleaned })
      .eq('id', 1);
    saveBtn.disabled = false;

    if (error) {
      show(`Could not save Resources page: ${error.message}`, 'error');
      return;
    }

    sections = cleaned;
    show('Resources page saved. Public resources will use the new content immediately.', 'success');
  }

  addBtn.addEventListener('click', () => addRow());
  saveBtn.addEventListener('click', save);
  sectionFilter.addEventListener('change', () => {
    syncRows();
    renderRows();
  });

  function ready(detail) {
    client = detail.client;
    load();
  }

  if (window.ODIT_MANAGEMENT?.ready) ready(window.ODIT_MANAGEMENT);
  else window.addEventListener('odit:management-ready', e => ready(e.detail), { once:true });
})();