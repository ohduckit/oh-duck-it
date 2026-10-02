(() => {
  const cfg = window.ODIT_SUPABASE || {};

  const DEFAULTS = {
    expansion: 'Midnight',
    season_name: 'Midnight Season 2',
    aotc_achieved: false,
    raid_nights: 'Wednesday & Thursday',
    raid_time: 'Time TBC',
    mythic_plus_night: 'Monday',
    warcraft_logs_url: '',
    raider_io_url: '',
    updated_at: null,
    raids: [
      {
        id: 'venomous-abyss',
        name: 'The Venomous Abyss',
        status: 'Live',
        bosses: 8,
        normal: 0,
        heroic: 0,
        mythic: 0,
        note: ''
      },
      {
        id: 'unbinding-kithix',
        name: "The Unbinding of Kith'ix",
        status: 'Upcoming',
        bosses: 1,
        normal: 0,
        heroic: 0,
        mythic: 0,
        note: '12.1.5 • 14 October'
      }
    ]
  };

  const $ = id => document.getElementById(id);

  const esc = (s = '') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const clamp = (value, min, max) => {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  const normaliseRaid = raid => {
    const bosses = clamp(raid?.bosses || 1, 1, 50);
    return {
      id: String(raid?.id || ''),
      name: String(raid?.name || 'Raid'),
      status: ['Live','Upcoming','Complete','Archived'].includes(raid?.status)
        ? raid.status
        : 'Live',
      bosses,
      normal: clamp(raid?.normal || 0, 0, bosses),
      heroic: clamp(raid?.heroic || 0, 0, bosses),
      mythic: clamp(raid?.mythic || 0, 0, bosses),
      note: String(raid?.note || '')
    };
  };

  function progressLine(label, kills, bosses) {
    const percent = bosses ? Math.round((kills / bosses) * 100) : 0;
    return `
      <div class="progress-line">
        <strong>${esc(label)}</strong>
        <div class="bar"><i style="width:${percent}%"></i></div>
        <span>${kills} / ${bosses}</span>
      </div>
    `;
  }

  function raidCard(raid) {
    const statusClass = raid.status.toLowerCase();
    const note = raid.note ? `<p class="raid-progress-note">${esc(raid.note)}</p>` : '';

    return `
      <article class="raid-progress-card ${statusClass}">
        <div class="raid-progress-head">
          <div>
            <div class="raid-progress-status ${statusClass}">${esc(raid.status)}</div>
            <h3>${esc(raid.name)}</h3>
          </div>
          <div class="raid-boss-count">${raid.bosses} ${raid.bosses === 1 ? 'boss' : 'bosses'}</div>
        </div>
        ${note}
        <div class="raid-progress-bars">
          ${progressLine('Normal', raid.normal, raid.bosses)}
          ${progressLine('Heroic', raid.heroic, raid.bosses)}
          ${progressLine('Mythic', raid.mythic, raid.bosses)}
        </div>
      </article>
    `;
  }

  function setExternalLink(el, url, label) {
    if (!el) return;
    if (url) {
      el.href = url;
      el.classList.remove('ghost');
      el.removeAttribute('aria-disabled');
      el.title = '';
    } else {
      el.href = '#';
      el.classList.add('ghost');
      el.setAttribute('aria-disabled', 'true');
      el.title = `${label} URL has not been added in Guild Management yet.`;
      el.addEventListener('click', event => event.preventDefault(), { once: true });
    }
  }

  function render(data) {
    const merged = { ...DEFAULTS, ...(data || {}) };
    const raids = (
      Array.isArray(merged.raids) && merged.raids.length
        ? merged.raids
        : DEFAULTS.raids
    )
      .map(normaliseRaid)
      .filter(raid => raid.status !== 'Archived');

    const liveRaid =
      raids.find(raid => raid.status === 'Live') ||
      raids.find(raid => raid.status === 'Complete') ||
      raids[0];

    $('progressionExpansion').textContent = merged.expansion || 'Midnight';
    $('progressionSeasonTitle').textContent = merged.season_name || 'Current Season';
    $('statSeason').textContent = merged.season_name || 'Current Season';
    $('statMplusNight').textContent = merged.mythic_plus_night || 'Monday';

    const liveNames = raids
      .filter(raid => raid.status === 'Live')
      .map(raid => raid.name);

    $('progressionSeasonMeta').textContent =
      liveNames.length
        ? `${liveNames.join(' • ')} • AoTC every season.`
        : 'AoTC every season.';

    if (liveRaid) {
      $('statRaidProgress').textContent =
        `Heroic ${liveRaid.heroic} / ${liveRaid.bosses}`;
    } else {
      $('statRaidProgress').textContent = 'Season planning';
    }

    const aotcBanner = $('aotcBanner');
    aotcBanner.hidden = merged.aotc_achieved !== true;

    const raidList = $('raidProgressList');
    raidList.innerHTML = raids.length
      ? raids.map(raidCard).join('')
      : '<div class="notice">No raids are currently listed for this season.</div>';

    const updated = $('progressUpdated');
    if (merged.updated_at) {
      const d = new Date(merged.updated_at);
      updated.textContent = `Updated ${d.toLocaleDateString([], { dateStyle: 'medium' })}`;
    } else {
      updated.textContent = '';
    }

    const schedule = $('scheduleList');
    schedule.innerHTML = `
      <div class="schedule-row">
        <strong>RAID</strong>
        <div>
          <b>${esc(merged.raid_nights || 'Wednesday & Thursday')}</b><br>
          <small>${esc(merged.raid_time || 'Time TBC')}</small>
        </div>
      </div>
      <div class="schedule-row">
        <strong>M+</strong>
        <div>
          <b>${esc(merged.mythic_plus_night || 'Monday')}</b><br>
          <small>Guild Mythic+ night</small>
        </div>
      </div>
      <div class="schedule-row">
        <strong>OPTIONAL</strong>
        <div>
          <b>Reclear / Fun Run</b><br>
          <small>Outside progression nights</small>
        </div>
      </div>
    `;

    const night = merged.mythic_plus_night || 'Monday';
    $('mythicPlusCopy').innerHTML =
      `<b>${esc(night)} Mythic+</b> gives the guild a predictable night for keys, ` +
      'score progression, learning and helping each other push.';

    setExternalLink($('warcraftLogsLink'), merged.warcraft_logs_url, 'Warcraft Logs');
    setExternalLink($('raiderIoLink'), merged.raider_io_url, 'Raider.IO');
  }

  render(DEFAULTS);

  const configured =
    cfg.url &&
    cfg.key &&
    !cfg.url.startsWith('YOUR_') &&
    !cfg.key.startsWith('YOUR_') &&
    window.supabase?.createClient;

  if (!configured) return;

  const client = window.supabase.createClient(cfg.url, cfg.key);

  async function load() {
    const { data, error } = await client
      .from('progression_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (!error && data) render(data);
  }

  load();
})();
