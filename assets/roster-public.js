(() => {
  const cfg = window.ODIT_SUPABASE || {};
  const app = document.getElementById('rosterApp');
  const progressSummary = document.getElementById('progressionRosterSummary');

  if (!window.supabase?.createClient || !cfg.url || !cfg.key) {
    if (app) {
      app.innerHTML = '<section class="panel"><div class="notice error">Roster is not available yet.</div></section>';
    }
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.key);

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

  const ROLE_META = {
    'Tank':       { icon:'🛡', short:'Tanks', color:'#b98a3d' },
    'Healer':     { icon:'✚', short:'Healers', color:'#79a96a' },
    'Melee DPS':  { icon:'⚔', short:'Melee', color:'#b66d4d' },
    'Ranged DPS': { icon:'🏹', short:'Ranged', color:'#6e8fb9' },
    'Flexible':   { icon:'◆', short:'Flexible', color:'#9a7ab1' }
  };

  const STATUS_LABEL = {
    core:'Core',
    trial:'Trial',
    reserve:'Reserve',
    inactive:'Inactive',
    not_raiding:'Not raiding'
  };

  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  function specIcon(row) {
    const data = window.ODIT_RECRUITMENT_SPEC_DATA;
    if (!data?.classes) return '';

    const cls = data.classes.find(c => c.name === row.class_name);
    const spec = cls?.specs?.find(s => s.name === row.spec_name);
    return spec?.icon || '';
  }

  function niceNumber(value, digits=0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString(undefined, {
      minimumFractionDigits:digits,
      maximumFractionDigits:digits
    });
  }

  function average(rows, field) {
    const values = rows
      .map(row => Number(row[field]))
      .filter(value => Number.isFinite(value) && value > 0);

    if (!values.length) return null;
    return values.reduce((a,b) => a + b, 0) / values.length;
  }

  function counts(rows, field) {
    const map = new Map();

    rows.forEach(row => {
      const key = row[field] || 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });

    return map;
  }

  function roleCount(rows, role) {
    return rows.filter(row => row.raid_role === role).length;
  }

  function statusCount(rows, status) {
    return rows.filter(row => row.raid_status === status).length;
  }

  function latestSync(rows) {
    const dates = rows
      .map(row => row.last_synced_at ? new Date(row.last_synced_at) : null)
      .filter(date => date && !Number.isNaN(date.getTime()));

    if (!dates.length) return '';
    return new Date(Math.max(...dates.map(date => date.getTime())));
  }

  function barRows(map, colors={}) {
    const entries = [...map.entries()]
      .sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    if (!entries.length) {
      return '<div class="roster-empty roster-empty-small">No data yet.</div>';
    }

    const max = Math.max(1, ...entries.map(([,count]) => count));

    return entries.map(([label,count]) => `
      <div class="roster-bar-row">
        <div class="roster-bar-label">
          <span>${esc(label)}</span>
          <b>${count}</b>
        </div>
        <div class="roster-bar">
          <span style="--pct:${(count / max) * 100}%;--bar-color:${esc(colors[label] || '#b88635')}"></span>
        </div>
      </div>
    `).join('');
  }

  function roleBars(rows) {
    const map = new Map();
    ROLE_ORDER.forEach(role => {
      const count = roleCount(rows, role);
      if (count) map.set(role, count);
    });

    const colors = Object.fromEntries(
      Object.entries(ROLE_META).map(([role,meta]) => [role,meta.color])
    );

    return barRows(map, colors);
  }

  function statusBadge(row) {
    const label = STATUS_LABEL[row.raid_status] || row.raid_status || 'Core';
    return `<span class="roster-status ${esc(row.raid_status || 'core')}">${esc(label)}</span>`;
  }

  function playerCard(row) {
    const portrait = row.avatar_url || '';
    const spec = specIcon(row);
    const classColor = CLASS_COLORS[row.class_name] || '#c69b6d';
    const href = row.raiderio_url || row.armory_url || '';
    const tag = href ? 'a' : 'article';
    const hrefAttr = href
      ? ` href="${esc(href)}" target="_blank" rel="noopener"`
      : '';

    const metrics = [];

    if (Number(row.item_level) > 0) {
      metrics.push(`
        <div class="roster-player-metric">
          <span>ILVL</span>
          <b>${niceNumber(row.item_level,1)}</b>
        </div>
      `);
    }

    if (Number(row.mplus_score) > 0) {
      metrics.push(`
        <div class="roster-player-metric">
          <span>M+</span>
          <b>${niceNumber(row.mplus_score,0)}</b>
        </div>
      `);
    }

    const location = [row.race_name, row.realm].filter(Boolean).map(esc).join(' • ');

    return `
      <${tag}
        class="roster-player-card status-${esc(row.raid_status || 'core')}"
        style="--class-color:${esc(classColor)}"
        ${hrefAttr}
      >
        <div class="roster-player-portrait-wrap">
          ${portrait
            ? `<img class="roster-player-avatar" src="${esc(portrait)}" alt="" loading="lazy">`
            : spec
              ? `<img class="roster-player-avatar roster-player-avatar-spec" src="${esc(spec)}" alt="" loading="lazy">`
              : `<div class="roster-player-avatar roster-player-avatar-empty"></div>`
          }
          ${portrait && spec
            ? `<img class="roster-player-spec-icon" src="${esc(spec)}" alt="" loading="lazy">`
            : ''
          }
        </div>

        <div class="roster-player-main">
          <div class="roster-player-name">
            <b>${esc(row.player_name)}</b>
            ${statusBadge(row)}
          </div>

          <div class="roster-player-spec">
            ${esc(row.spec_name)} ${esc(row.class_name)}
          </div>

          ${location
            ? `<div class="roster-player-sub">${location}</div>`
            : ''
          }
        </div>

        ${metrics.length
          ? `<div class="roster-player-metrics">${metrics.join('')}</div>`
          : ''
        }
      </${tag}>
    `;
  }

  function roleSection(rows, role) {
    const roleRows = rows.filter(row => row.raid_role === role);
    if (!roleRows.length) return '';

    const meta = ROLE_META[role] || { icon:'◆', short:role, color:'#b88635' };
    const core = roleRows.filter(row => row.raid_status === 'core').length;
    const trial = roleRows.filter(row => row.raid_status === 'trial').length;
    const reserve = roleRows.filter(row => row.raid_status === 'reserve').length;

    const statusParts = [];
    if (core) statusParts.push(`${core} core`);
    if (trial) statusParts.push(`${trial} trial`);
    if (reserve) statusParts.push(`${reserve} reserve`);

    return `
      <section class="roster-role-section" style="--role-color:${esc(meta.color)}">
        <div class="roster-role-head">
          <div class="roster-role-title">
            <span class="roster-role-icon">${meta.icon}</span>
            <div>
              <h3>${esc(role)}</h3>
              <small>${esc(statusParts.join(' • '))}</small>
            </div>
          </div>
          <span class="roster-role-count">${roleRows.length}</span>
        </div>

        <div class="roster-player-grid">
          ${roleRows.map(playerCard).join('')}
        </div>
      </section>
    `;
  }

  function renderPublic(rows) {
    if (!app) return;

    const core = statusCount(rows, 'core');
    const trials = statusCount(rows, 'trial');
    const reserves = statusCount(rows, 'reserve');

    const avgIlvl = average(rows, 'item_level');
    const avgMplus = average(rows, 'mplus_score');

    const synced = rows.filter(row => row.last_synced_at).length;
    const syncedPct = rows.length ? Math.round((synced / rows.length) * 100) : 0;

    const roleSections = ROLE_ORDER
      .map(role => roleSection(rows, role))
      .filter(Boolean)
      .join('');

    const classCounts = counts(rows, 'class_name');

    const armorCounts = new Map();
    rows.forEach(row => {
      const armor = ARMOR[row.class_name] || 'Other';
      armorCounts.set(armor, (armorCounts.get(armor) || 0) + 1);
    });

    const armorColors = {
      Plate:'#9ea2a4',
      Leather:'#9c5366',
      Mail:'#388bb7',
      Cloth:'#d8d4c9',
      Other:'#927a58'
    };

    const lastSync = latestSync(rows);

    app.innerHTML = `
      <section class="panel roster-hero anchor-section" id="core-team">
        <div class="roster-hero-head">
          <div>
            <div class="eyebrow">Progression roster</div>
            <h2>Raid Team</h2>
            <p>
              The players currently forming ODit's progression roster,
              including active trials and reserve depth.
            </p>
          </div>

          <div class="roster-status-legend">
            <span class="roster-status core">Core</span>
            ${trials ? '<span class="roster-status trial">Trial</span>' : ''}
            ${reserves ? '<span class="roster-status reserve">Reserve</span>' : ''}
          </div>
        </div>

        <div class="roster-hero-summary">
          <div>
            <span>Active roster</span>
            <b>${rows.length}</b>
          </div>
          <div>
            <span>Core</span>
            <b>${core}</b>
          </div>
          <div>
            <span>Trials</span>
            <b>${trials}</b>
          </div>
          <div>
            <span>Reserve</span>
            <b>${reserves}</b>
          </div>
        </div>

        <div class="roster-group-list">
          ${roleSections || '<div class="roster-empty">No public raid roster is currently configured.</div>'}
        </div>
      </section>

      <section class="panel anchor-section" id="roster-overview">
        <div class="section-title roster-section-title">
          <div>
            <div class="eyebrow">At a glance</div>
            <h2>Roster Overview</h2>
          </div>
          ${lastSync
            ? `<span class="roster-last-sync">Profiles refreshed ${lastSync.toLocaleDateString([], {dateStyle:'medium'})}</span>`
            : ''
          }
        </div>

        <div class="roster-overview-grid">
          <div class="roster-overview-stat">
            <span>Raiders</span>
            <b>${rows.length}</b>
            <small>${core} core • ${trials} trial${trials === 1 ? '' : 's'}</small>
          </div>

          <div class="roster-overview-stat">
            <span>Tanks</span>
            <b>${roleCount(rows,'Tank')}</b>
            <small>Primary raid role</small>
          </div>

          <div class="roster-overview-stat">
            <span>Healers</span>
            <b>${roleCount(rows,'Healer')}</b>
            <small>Primary raid role</small>
          </div>

          <div class="roster-overview-stat">
            <span>Melee / Ranged</span>
            <b>${roleCount(rows,'Melee DPS')} / ${roleCount(rows,'Ranged DPS')}</b>
            <small>DPS balance</small>
          </div>

          <div class="roster-overview-stat">
            <span>Average ilvl</span>
            <b>${avgIlvl === null ? '—' : niceNumber(avgIlvl,1)}</b>
            <small>${synced ? `${synced}/${rows.length} profiles synced` : 'Awaiting profile sync'}</small>
          </div>

          <div class="roster-overview-stat">
            <span>Average M+</span>
            <b>${avgMplus === null ? '—' : niceNumber(avgMplus,0)}</b>
            <small>${syncedPct ? `${syncedPct}% profile coverage` : 'Awaiting profile sync'}</small>
          </div>
        </div>
      </section>

      <section class="panel anchor-section" id="composition">
        <div class="section-title roster-section-title">
          <div>
            <div class="eyebrow">Roster health</div>
            <h2>Composition</h2>
          </div>
        </div>

        <div class="roster-composition-grid roster-composition-grid-three">
          <div class="roster-composition-card">
            <h3>Role Balance</h3>
            <div class="roster-bar-list">${roleBars(rows)}</div>
          </div>

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
          Officer-controlled roster status and raid roles. Character profile data can be refreshed from
          <a href="https://raider.io/" target="_blank" rel="noopener">Raider.IO</a>.
        </div>
      </section>
    `;
  }

  function renderProgressSummary(rows) {
    if (!progressSummary) return;

    const trials = statusCount(rows, 'trial');

    progressSummary.innerHTML = `
      <div class="progression-roster-chip"><b>${rows.length}</b>Total</div>
      <div class="progression-roster-chip"><b>${roleCount(rows,'Tank')}</b>Tanks</div>
      <div class="progression-roster-chip"><b>${roleCount(rows,'Healer')}</b>Healers</div>
      <div class="progression-roster-chip"><b>${roleCount(rows,'Melee DPS')}</b>Melee</div>
      <div class="progression-roster-chip"><b>${roleCount(rows,'Ranged DPS')}</b>Ranged</div>
      ${trials ? `<div class="progression-roster-chip"><b>${trials}</b>Trials</div>` : ''}
    `;
  }

  async function init() {
    const { data, error } = await client.rpc('get_public_raid_roster');

    if (error) {
      if (app) {
        app.innerHTML = `
          <section class="panel">
            <div class="notice error">The raid roster could not be loaded right now.</div>
          </section>
        `;
      }
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    renderPublic(rows);
    renderProgressSummary(rows);
  }

  init();
})();
