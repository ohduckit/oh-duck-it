(() => {
  const cfg = window.ODIT_SUPABASE || {};
  const configured =
    cfg.url &&
    cfg.key &&
    !cfg.url.startsWith('YOUR_') &&
    !cfg.key.startsWith('YOUR_') &&
    window.supabase?.createClient;

  const message = document.getElementById('progressionMessage');
  const raidRows = document.getElementById('progressionRaidRows');
  const addRaidBtn = document.getElementById('addProgressionRaid');
  const saveBtn = document.getElementById('saveProgression');

  if (!message || !raidRows || !addRaidBtn || !saveBtn) return;

  const expansion = document.getElementById('progressionExpansion');
  const season = document.getElementById('progressionSeason');
  const raidNights = document.getElementById('progressionRaidNights');
  const raidTime = document.getElementById('progressionRaidTime');
  const mplusNight = document.getElementById('progressionMplusNight');
  const aotc = document.getElementById('progressionAotc');
  const wcl = document.getElementById('progressionWcl');
  const rio = document.getElementById('progressionRaiderIo');

  const DEFAULTS = {
    expansion: 'Midnight',
    season_name: 'Midnight Season 2',
    aotc_achieved: false,
    raid_nights: 'Wednesday & Thursday',
    raid_time: 'Time TBC',
    mythic_plus_night: 'Monday',
    warcraft_logs_url: '',
    raider_io_url: '',
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

  const esc = (s = '') => String(s).replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[c]));

  const show = (text, kind = 'info') => {
    message.hidden = false;
    message.className = `notice ${kind}`;
    message.textContent = text;
  };

  const hide = () => { message.hidden = true; };

  const clamp = (value, min, max) => {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  const makeId = name => {
    const slug = String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return slug || `raid-${Date.now()}`;
  };

  function normaliseRaid(input = {}) {
    const bosses = clamp(input.bosses || 1, 1, 50);
    return {
      id: String(input.id || makeId(input.name)),
      name: String(input.name || 'New raid'),
      status: ['Live','Upcoming','Complete','Archived'].includes(input.status)
        ? input.status
        : 'Live',
      bosses,
      normal: clamp(input.normal || 0, 0, bosses),
      heroic: clamp(input.heroic || 0, 0, bosses),
      mythic: clamp(input.mythic || 0, 0, bosses),
      note: String(input.note || '')
    };
  }

  function addRaidRow(item = {}) {
    const raid = normaliseRaid(item);
    const row = document.createElement('div');
    row.className = 'progression-raid-admin-row';
    row.dataset.raidId = raid.id;

    row.innerHTML = `
      <div class="field progression-raid-name-field">
        <label>Raid</label>
        <input class="progression-raid-name" maxlength="100" value="${esc(raid.name)}" placeholder="Raid name">
      </div>
      <div class="field">
        <label>Status</label>
        <select class="progression-raid-status">
          ${['Live','Upcoming','Complete','Archived'].map(status =>
            `<option value="${status}" ${status === raid.status ? 'selected' : ''}>${status}</option>`
          ).join('')}
        </select>
      </div>
      <div class="field compact-number">
        <label>Bosses</label>
        <input class="progression-raid-bosses" type="number" min="1" max="50" value="${raid.bosses}">
      </div>
      <div class="field compact-number">
        <label>Normal</label>
        <input class="progression-raid-normal" type="number" min="0" max="${raid.bosses}" value="${raid.normal}">
      </div>
      <div class="field compact-number">
        <label>Heroic</label>
        <input class="progression-raid-heroic" type="number" min="0" max="${raid.bosses}" value="${raid.heroic}">
      </div>
      <div class="field compact-number">
        <label>Mythic</label>
        <input class="progression-raid-mythic" type="number" min="0" max="${raid.bosses}" value="${raid.mythic}">
      </div>
      <div class="field progression-raid-note-field">
        <label>Public note</label>
        <input class="progression-raid-note" maxlength="120" value="${esc(raid.note)}" placeholder="Optional">
      </div>
      <div class="progression-raid-controls">
        <button class="btn progression-raid-up" type="button" title="Move up">↑</button>
        <button class="btn progression-raid-down" type="button" title="Move down">↓</button>
        <button class="btn danger progression-raid-remove" type="button">Remove</button>
      </div>
    `;

    const bossesInput = row.querySelector('.progression-raid-bosses');
    const killInputs = [
      row.querySelector('.progression-raid-normal'),
      row.querySelector('.progression-raid-heroic'),
      row.querySelector('.progression-raid-mythic')
    ];

    const syncCaps = () => {
      const bosses = clamp(bossesInput.value, 1, 50);
      bossesInput.value = String(bosses);
      killInputs.forEach(input => {
        input.max = String(bosses);
        input.value = String(clamp(input.value, 0, bosses));
      });
    };

    bossesInput.addEventListener('change', syncCaps);
    killInputs.forEach(input => input.addEventListener('change', syncCaps));

    row.querySelector('.progression-raid-remove').addEventListener('click', () => row.remove());

    row.querySelector('.progression-raid-up').addEventListener('click', () => {
      const prev = row.previousElementSibling;
      if (prev) raidRows.insertBefore(row, prev);
    });

    row.querySelector('.progression-raid-down').addEventListener('click', () => {
      const next = row.nextElementSibling;
      if (next) raidRows.insertBefore(next, row);
    });

    raidRows.appendChild(row);
  }

  function render(data) {
    expansion.value = data.expansion || DEFAULTS.expansion;
    season.value = data.season_name || DEFAULTS.season_name;
    raidNights.value = data.raid_nights || DEFAULTS.raid_nights;
    raidTime.value = data.raid_time || DEFAULTS.raid_time;
    mplusNight.value = data.mythic_plus_night || DEFAULTS.mythic_plus_night;
    aotc.checked = data.aotc_achieved === true;
    wcl.value = data.warcraft_logs_url || '';
    rio.value = data.raider_io_url || '';

    raidRows.innerHTML = '';
    const raids =
      Array.isArray(data.raids) && data.raids.length
        ? data.raids
        : DEFAULTS.raids;

    raids.forEach(addRaidRow);
  }

  function collectRaids() {
    return [...raidRows.querySelectorAll('.progression-raid-admin-row')]
      .map(row => {
        const bosses = clamp(
          row.querySelector('.progression-raid-bosses').value,
          1,
          50
        );
        const name = row.querySelector('.progression-raid-name').value.trim();

        return {
          id: row.dataset.raidId || makeId(name),
          name: name || 'Raid',
          status: row.querySelector('.progression-raid-status').value,
          bosses,
          normal: clamp(row.querySelector('.progression-raid-normal').value, 0, bosses),
          heroic: clamp(row.querySelector('.progression-raid-heroic').value, 0, bosses),
          mythic: clamp(row.querySelector('.progression-raid-mythic').value, 0, bosses),
          note: row.querySelector('.progression-raid-note').value.trim()
        };
      });
  }

  if (!configured) {
    render(DEFAULTS);
    saveBtn.disabled = true;
    show('Progression backend is not connected. Check the Supabase configuration.', 'error');
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.key);

  async function load() {
    hide();

    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) return;

    const { data: isOfficer, error: officerError } = await client.rpc('is_officer');
    if (officerError || !isOfficer) return;

    const { data, error } = await client
      .from('progression_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      render(DEFAULTS);
      saveBtn.disabled = true;
      show(
        'Progression management is ready, but the database table is missing. Run supabase-progression-management.sql first.',
        'info'
      );
      return;
    }

    render(data || DEFAULTS);
    saveBtn.disabled = false;
  }

  async function save() {
    const raids = collectRaids();

    if (!raids.length) {
      show('Add at least one raid before saving progression.', 'error');
      return;
    }

    const payload = {
      expansion: expansion.value.trim() || 'Midnight',
      season_name: season.value.trim() || 'Current Season',
      aotc_achieved: aotc.checked,
      raid_nights: raidNights.value.trim() || 'Wednesday & Thursday',
      raid_time: raidTime.value.trim() || 'Time TBC',
      mythic_plus_night: mplusNight.value.trim() || 'Monday',
      warcraft_logs_url: wcl.value.trim() || null,
      raider_io_url: rio.value.trim() || null,
      raids
    };

    saveBtn.disabled = true;

    const { error } = await client
      .from('progression_settings')
      .update(payload)
      .eq('id', 1);

    saveBtn.disabled = false;

    if (error) {
      show(`Could not save progression: ${error.message}`, 'error');
      return;
    }

    show('Progression saved. The public Progression page will use the new values immediately.', 'success');
  }

  addRaidBtn.addEventListener('click', () => addRaidRow({
    id: `raid-${Date.now()}`,
    name: '',
    status: 'Upcoming',
    bosses: 1,
    normal: 0,
    heroic: 0,
    mythic: 0,
    note: ''
  }));

  saveBtn.addEventListener('click', save);

  client.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_IN') window.setTimeout(load, 50);
  });

  load();
})();
