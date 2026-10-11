(() => {
  const cfg = window.ODIT_SUPABASE || {};
  if (!window.supabase?.createClient || !cfg.url || !cfg.key) return;

  const client = window.supabase.createClient(cfg.url, cfg.key);
  const app = document.getElementById('rosterApp');
  const progressSummary = document.getElementById('progressionRosterSummary');

  const CLASS_COLORS = {
    'Death Knight':'#C41E3A','Demon Hunter':'#A330C9','Druid':'#FF7C0A',
    'Evoker':'#33937F','Hunter':'#AAD372','Mage':'#3FC7EB','Monk':'#00FF98',
    'Paladin':'#F48CBA','Priest':'#FFFFFF','Rogue':'#FFF468','Shaman':'#0070DD',
    'Warlock':'#8788EE','Warrior':'#C69B6D'
  };

  const ARMOR = {
    'Death Knight':'Plate','Paladin':'Plate','Warrior':'Plate',
    'Demon Hunter':'Leather','Druid':'Leather','Monk':'Leather','Rogue':'Leather',
    'Evoker':'Mail','Hunter':'Mail','Shaman':'Mail',
    'Mage':'Cloth','Priest':'Cloth','Warlock':'Cloth'
  };

  const ROLE_ORDER = ['Tank','Healer','Melee DPS','Ranged DPS','Flexible'];
  const STATUS_LABEL = {
    core:'Core', trial:'Trial', reserve:'Reserve',
    inactive:'Inactive', not_raiding:'Not raiding'
  };

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  function specIcon(row) {
    const data = window.ODIT_RECRUITMENT_SPEC_DATA;
    if (!data?.classes) return '';
    const cls = data.classes.find(c => c.name === row.class_name);
    return cls?.specs?.find(s => s.name === row.spec_name)?.icon || '';
  }

  const avatar = row => row.avatar_url || specIcon(row) || '';

  function niceNumber(value, digits=0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString(undefined, {
      minimumFractionDigits:digits,
      maximumFractionDigits:digits
    });
  }

  function avg(rows, field) {
    const values = rows.map(r => Number(r[field])).filter(v => Number.isFinite(v) && v > 0);
    if (!values.length) return null;
    return values.reduce((a,b) => a+b, 0) / values.length;
  }

  function counts(rows, field) {
    const map = new Map();
    rows.forEach(row => {
      const key = row[field] || 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }

  function barRows(map, colors={}) {
    const entries = [...map.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
    const max = Math.max(1, ...entries.map(([,n]) => n));

    return entries.map(([label,n]) => `
      <div class="roster-bar-row">
        <div class="roster-bar-label"><span>${esc(label)}</span><b>${n}</b></div>
        <div class="roster-bar">
          <span style="--pct:${(n/max)*100}%;--bar-color:${esc(colors[label] || '#b88635')}"></span>
        </div>
      </div>
    `).join('');
  }

  function playerCard(row) {
    const image = avatar(row);
    const href = row.raiderio_url || row.armory_url || '';
    const tag = href ? 'a' : 'article';
    const hrefAttr = href ? ` href="${esc(href)}" target="_blank" rel="noopener"` : '';

    const metrics = [];
    if (Number(row.item_level) > 0) metrics.push(`<b>${niceNumber(row.item_level,1)} ilvl</b>`);
    if (Number(row.mplus_score) > 0) metrics.push(`${niceNumber(row.mplus_score,0)} M+`);

    return `
      <${tag} class="roster-player-card" style="--class-color:${esc(CLASS_COLORS[row.class_name] || '#b88635')}"${hrefAttr}>
        ${image ? `<img class="roster-player-avatar" src="${esc(image)}" alt="" loading="lazy">` : `<div class="roster-player-avatar"></div>`}
        <div class="roster-player-main">
          <div class="roster-player-name">
            <b>${esc(row.player_name)}</b>
            ${row.raid_status !== 'core'
              ? `<span class="roster-status ${esc(row.raid_status)}">${esc(STATUS_LABEL[row.raid_status] || row.raid_status)}</span>`
              : ''
            }
          </div>
          <small>${esc(row.spec_name)} ${esc(row.class_name)}</small>
          <div class="roster-player-sub">${[row.race_name, row.realm].filter(Boolean).map(esc).join(' • ')}</div>
        </div>
        <div class="roster-metric">${metrics.join('<br>')}</div>
      </${tag}>
    `;
  }

  function renderPublic(rows) {
    if (!app) return;

    const core = rows.filter(r => r.raid_status === 'core').length;
    const trials = rows.filter(r => r.raid_status === 'trial').length;
    const reserves = rows.filter(r => r.raid_status === 'reserve').length;
    const avgIlvl = avg(rows, 'item_level');
    const avgMplus = avg(rows, 'mplus_score');

    const groups = ROLE_ORDER.map(role => {
      const roleRows = rows.filter(r => r.raid_role === role);
      if (!roleRows.length) return '';

      return `
        <section class="roster-role-section">
          <div class="roster-role-head">
            <h3>${esc(role)}</h3>
            <span class="roster-role-count">${roleRows.length}</span>
          </div>
          <div class="roster-player-grid">${roleRows.map(playerCard).join('')}</div>
        </section>
      `;
    }).join('');

    const classCounts = counts(rows, 'class_name');
    const armorCounts = new Map();
    rows.forEach(row => {
      const armor = ARMOR[row.class_name] || 'Other';
      armorCounts.set(armor, (armorCounts.get(armor) || 0) + 1);
    });

    const armorColors = {
      Plate:'#9ea2a4', Leather:'#8b3a53', Mail:'#148dc6', Cloth:'#e5e0d5'
    };

    app.innerHTML = `
      <section class="panel roster-hero anchor-section" id="core-team">
        <div class="roster-hero-head">
          <div>
            <div class="eyebrow">Raid team</div>
            <h2>Core Team</h2>
            <p>Core raiders, current trials and reserve depth for progression.</p>
          </div>
          <div class="roster-status-legend">
            <span class="roster-status core">Core</span>
            ${trials ? '<span class="roster-status trial">Trial</span>' : ''}
            ${reserves ? '<span class="roster-status reserve">Reserve</span>' : ''}
          </div>
        </div>
        <div class="roster-group-list">${groups || '<div class="roster-empty">No public raid roster is currently configured.</div>'}</div>
      </section>

      <section class="panel anchor-section" id="roster-overview">
        <div class="section-title"><h2>Roster Overview</h2></div>
        <div class="roster-overview-grid">
          <div class="roster-overview-stat"><span>Characters</span><b>${rows.length}</b></div>
          <div class="roster-overview-stat"><span>Core Raiders</span><b>${core}</b></div>
          <div class="roster-overview-stat"><span>Trials</span><b>${trials}</b></div>
          <div class="roster-overview-stat"><span>Average ilvl</span><b>${avgIlvl === null ? '—' : niceNumber(avgIlvl,1)}</b></div>
          <div class="roster-overview-stat"><span>Average M+</span><b>${avgMplus === null ? '—' : niceNumber(avgMplus,0)}</b></div>
        </div>
      </section>

      <section class="panel anchor-section" id="composition">
        <div class="section-title"><h2>Composition</h2></div>
        <div class="roster-composition-grid">
          <div class="roster-composition-card">
            <h3>Classes</h3>
            <div class="roster-bar-list">${barRows(classCounts, CLASS_COLORS)}</div>
          </div>
          <div class="roster-composition-card">
            <h3>Armor Types</h3>
            <div class="roster-bar-list">${barRows(armorCounts, armorColors)}</div>
          </div>
        </div>
        <div class="roster-attribution">
          Character profile data may be refreshed from
          <a href="https://raider.io/" target="_blank" rel="noopener">Raider.IO</a>.
        </div>
      </section>
    `;
  }

  function renderProgressSummary(rows) {
    if (!progressSummary) return;

    const roleCount = role => rows.filter(r => r.raid_role === role).length;
    const trials = rows.filter(r => r.raid_status === 'trial').length;

    progressSummary.innerHTML = `
      <div class="progression-roster-chip"><b>${rows.length}</b>Total</div>
      <div class="progression-roster-chip"><b>${roleCount('Tank')}</b>Tanks</div>
      <div class="progression-roster-chip"><b>${roleCount('Healer')}</b>Healers</div>
      <div class="progression-roster-chip"><b>${roleCount('Melee DPS')}</b>Melee</div>
      <div class="progression-roster-chip"><b>${roleCount('Ranged DPS')}</b>Ranged</div>
      ${trials ? `<div class="progression-roster-chip"><b>${trials}</b>Trials</div>` : ''}
    `;
  }

  async function init() {
    const { data, error } = await client.rpc('get_public_raid_roster');

    if (error) {
      if (app) app.innerHTML = `<section class="panel"><div class="notice error">Roster is not available yet.</div></section>`;
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    renderPublic(rows);
    renderProgressSummary(rows);
  }

  init();
})();
