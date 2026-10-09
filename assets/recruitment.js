(() => {
  const form = document.getElementById('recruitmentForm');
  if (!form) return;

  const msg = document.getElementById('formMessage');
  const backendNotice = document.getElementById('backendNotice');
  const submitBtn = document.getElementById('submitBtn');
  const classSelect = document.getElementById('class_name');
  const regionSelect = document.getElementById('region');
  const realmInput = document.getElementById('realm');
  const realmOptions = document.getElementById('realmOptions');
  const mainSpecSelect = document.getElementById('main_spec');
  const offSpecSelect = document.getElementById('off_specs');
  const profession1 = document.getElementById('profession_1');
  const profession2 = document.getElementById('profession_2');
  const interestBoxes = [...form.querySelectorAll('input[name^="interest_"]')];
  const characterInput = document.getElementById('character_name');
  const profileInputs = {
    raiderio: document.getElementById('raiderio_url'),
    wcl: document.getElementById('wcl_url'),
    armory: document.getElementById('armory_url')
  };
  const profileInputList = Object.values(profileInputs).filter(Boolean);

  const cfg = window.ODIT_SUPABASE || {};
  const configured =
    cfg.url &&
    cfg.key &&
    !cfg.url.startsWith('YOUR_') &&
    !cfg.key.startsWith('YOUR_');

  let client = null;
  const securityCfg = window.ODIT_SECURITY || {};
  let turnstileWidgetId = null;
  let turnstileToken = '';

  // Current Midnight specialisations. Demon Hunter includes Devourer.
  const CLASS_SPECS = {
    'Death Knight': ['Blood', 'Frost', 'Unholy'],
    'Demon Hunter': ['Devourer', 'Havoc', 'Vengeance'],
    'Druid': ['Balance', 'Feral', 'Guardian', 'Restoration'],
    'Evoker': ['Augmentation', 'Devastation', 'Preservation'],
    'Hunter': ['Beast Mastery', 'Marksmanship', 'Survival'],
    'Mage': ['Arcane', 'Fire', 'Frost'],
    'Monk': ['Brewmaster', 'Mistweaver', 'Windwalker'],
    'Paladin': ['Holy', 'Protection', 'Retribution'],
    'Priest': ['Discipline', 'Holy', 'Shadow'],
    'Rogue': ['Assassination', 'Outlaw', 'Subtlety'],
    'Shaman': ['Elemental', 'Enhancement', 'Restoration'],
    'Warlock': ['Affliction', 'Demonology', 'Destruction'],
    'Warrior': ['Arms', 'Fury', 'Protection']
  };

  // Preferred role is no longer asked of the applicant. It is derived from the
  // selected class + main spec and still written to the legacy `role` column so
  // existing officer views / Discord notifications can use it automatically.
  const SPEC_ROLES = {
    'Death Knight': {
      Blood: 'Tank',
      Frost: 'Melee DPS',
      Unholy: 'Melee DPS'
    },
    'Demon Hunter': {
      Devourer: 'Ranged DPS',
      Havoc: 'Melee DPS',
      Vengeance: 'Tank'
    },
    Druid: {
      Balance: 'Ranged DPS',
      Feral: 'Melee DPS',
      Guardian: 'Tank',
      Restoration: 'Healer'
    },
    Evoker: {
      Augmentation: 'Ranged DPS',
      Devastation: 'Ranged DPS',
      Preservation: 'Healer'
    },
    Hunter: {
      'Beast Mastery': 'Ranged DPS',
      Marksmanship: 'Ranged DPS',
      Survival: 'Melee DPS'
    },
    Mage: {
      Arcane: 'Ranged DPS',
      Fire: 'Ranged DPS',
      Frost: 'Ranged DPS'
    },
    Monk: {
      Brewmaster: 'Tank',
      Mistweaver: 'Healer',
      Windwalker: 'Melee DPS'
    },
    Paladin: {
      Holy: 'Healer',
      Protection: 'Tank',
      Retribution: 'Melee DPS'
    },
    Priest: {
      Discipline: 'Healer',
      Holy: 'Healer',
      Shadow: 'Ranged DPS'
    },
    Rogue: {
      Assassination: 'Melee DPS',
      Outlaw: 'Melee DPS',
      Subtlety: 'Melee DPS'
    },
    Shaman: {
      Elemental: 'Ranged DPS',
      Enhancement: 'Melee DPS',
      Restoration: 'Healer'
    },
    Warlock: {
      Affliction: 'Ranged DPS',
      Demonology: 'Ranged DPS',
      Destruction: 'Ranged DPS'
    },
    Warrior: {
      Arms: 'Melee DPS',
      Fury: 'Melee DPS',
      Protection: 'Tank'
    }
  };

  function inferredRole(className, spec) {
    return SPEC_ROLES[className]?.[spec] || null;
  }

  // Searchable realm suggestions. The realm field deliberately still accepts a
  // manually typed value so a newly-added / renamed realm can never block an application.
  // EU is the guild's primary region, so it has the broadest suggestion list.
  const REALMS = {
    EU: [
      "Aerie Peak","Agamaggan","Aggra (Português)","Aggramar","Ahn'Qiraj","Al'Akir",
      "Alexstrasza","Alleria","Alonsus","Aman'Thul","Ambossar","Anachronos","Anetheron",
      "Antonidas","Anub'arak","Arak-arahm","Arathi","Arathor","Archimonde","Area 52",
      "Argent Dawn","Arthas","Arygos","Aszune","Auchindoun","Azjol-Nerub","Azuremyst",
      "Baelgun","Balnazzar","Blackhand","Blackmoore","Blackrock","Blackscar","Blade's Edge",
      "Bladefist","Bloodfeather","Bloodhoof","Bloodscalp","Blutkessel","Booty Bay",
      "Boulderfist","Bronze Dragonflight","Bronzebeard","Burning Blade","Burning Legion",
      "Burning Steppes","C'Thun","Chamber of Aspects","Chants éternels","Cho'gall",
      "Confrérie du Thorium","Crushridge","Cult de la Rive noire","Dalaran","Darkmoon Faire",
      "Darksorrow","Darkspear","Das Konsortium","Das Syndikat","Deathguard","Deathweaver",
      "Deathwing","Defias Brotherhood","Dentarg","Der Mithrilorden","Der Rat von Dalaran",
      "Die Aldor","Die Arguswacht","Die ewige Wacht","Die Nachtwache","Die Silberne Hand",
      "Die Todeskrallen","Doomhammer","Draenor","Dragonblight","Dragonmaw","Drak'thul",
      "Drek'Thar","Dun Modr","Dun Morogh","Dunemaul","Durotan","Earthen Ring","Echsenkessel",
      "Eitrigg","Eldre'Thalas","Emerald Dream","Emeriss","Eonar","Eredar","Executus",
      "Exodar","Festung der Stürme","Fordragon","Forscherliga","Frostmane","Frostmourne",
      "Frostwhisper","Garona","Genjuros","Ghostlands","Gilneas","Grim Batol","Gul'dan",
      "Hakkar","Haomarush","Hellfire","Hellscream","Hyjal","Illidan","Jaedenar","Kael'thas",
      "Karazhan","Kargath","Kazzak","Khadgar","Khaz Modan","Khaz'goroth","Kil'jaeden",
      "Kilrogg","Kirin Tor","Kor'gall","Krag'jin","Krasus","Kul Tiras","La Croisade écarlate",
      "Laughing Skull","Les Clairvoyants","Les Sentinelles","Lightbringer","Lightning's Blade",
      "Lordaeron","Los Errantes","Lothar","Madmortem","Magtheridon","Mal'Ganis","Malfurion",
      "Malorne","Malygos","Mannoroth","Marécage de Zangar","Mazrigos","Medivh","Minahonda",
      "Moonglade","Mug'thol","Nagrand","Nathrezim","Naxxramas","Nazjatar","Nefarian",
      "Nemesis","Neptulon","Ner'zhul","Nera'thor","Nethersturm","Nordrassil","Norgannon",
      "Nozdormu","Onyxia","Outland","Perenolde","Pozzo dell'Eternità","Proudmoore","Quel'Thalas",
      "Ragnaros","Rajaxx","Rashgarroth","Ravencrest","Ravenholdt","Rexxar","Runetotem",
      "Sanguino","Sargeras","Saurfang","Scarshield Legion","Sen'jin","Shadowsong",
      "Shattered Halls","Shattered Hand","Shattrath","Shen'dralar","Silvermoon","Sinstralis",
      "Skullcrusher","Spinebreaker","Sporeggar","Steamwheedle Cartel","Stormrage","Stormreaver",
      "Stormscale","Sunstrider","Sylvanas","Taerar","Talnivarr","Tarren Mill","Teldrassil",
      "Terenas","Terokkar","Terrordar","The Maelstrom","The Sha'tar","The Venture Co",
      "Theradras","Thrall","Throk'Feroth","Thunderhorn","Tirion","Todeswache","Trollbane",
      "Turalyon","Twilight's Hammer","Twisting Nether","Tyrande","Uldaman","Ulduar","Uldum",
      "Un'Goro","Varimathras","Vashj","Vek'lor","Vek'nilash","Vol'jin","Wildhammer",
      "Wrathbringer","Xavius","Ysera","Ysondre","Zenedar","Zirkel des Cenarius","Zuluhed"
    ],
    US: [
      "A52","Aegwynn","Aerie Peak","Aggramar","Akama","Alexstrasza","Alleria","Alterac Mountains",
      "Area 52","Argent Dawn","Arthas","Arygos","Auchindoun","Azgalor","Azjol-Nerub","Azralon",
      "Barthilas","Black Dragonflight","Blackhand","Blackrock","Bleeding Hollow","Bloodhoof",
      "Bonechewer","Borean Tundra","Bronzebeard","Burning Blade","Burning Legion","Caelestrasz",
      "Cenarius","Cho'gall","Dalaran","Darkspear","Deathwing","Doomhammer","Draenor","Dragonblight",
      "Dragonmaw","Dreadmaul","Earthen Ring","Eitrigg","Emerald Dream","Eonar","Executus",
      "Frostmane","Frostmourne","Garona","Ghostlands","Gilneas","Greymane","Grizzly Hills",
      "Gundrak","Hellscream","Hyjal","Illidan","Jubei'Thos","Kel'Thuzad","Khaz Modan",
      "Kil'jaeden","Kilrogg","Kirin Tor","Korgath","Lightbringer","Mal'Ganis","Mannoroth",
      "Medivh","Moon Guard","Nagrand","Nazjatar","Ner'zhul","Proudmoore","Quel'Thalas",
      "Ragnaros","Ravencrest","Sargeras","Sen'jin","Shadowmoon","Shadowsong","Silver Hand",
      "Skywall","Spinebreaker","Stormrage","Stormreaver","Stormscale","Tichondrius","Thrall",
      "Thunderhorn","Turalyon","Twisting Nether","Uldaman","Uldum","Vashj","Whisperwind",
      "Wildhammer","Wyrmrest Accord","Zul'jin"
    ],
    KR: ["Azshara","Burning Legion","Cenarius","Dalaran","Deathwing","Durotan","Garona","Gul'dan","Hellscream","Hyjal","Norgannon","Rexxar","Stormrage","Windrunner"],
    TW: ["Arthas","Bleeding Hollow","Crystalpine Stinger","Dragonmaw","Frostmane","Hellfire","Icecrown","Light's Hope","Menethil","Nightsong","Order of the Cloud Serpent","Quel'dorei","Shadowmoon","Silverwing Hold","Skywall","Stormscale","Wrathbringer"]
  };

  const show = (el, text, kind='info') => {
    el.hidden = false;
    el.className = `notice ${kind}`;
    el.textContent = text;
  };

  if (!configured) {
    show(
      backendNotice,
      'Recruitment backend not connected yet. Add the Supabase URL and publishable/anon key in assets/supabase-config.js after running the database setup.',
      'info'
    );
    submitBtn.disabled = true;
    submitBtn.title = 'Connect Supabase first';
  } else {
    client = window.supabase.createClient(cfg.url, cfg.key);
  }

  const value = (fd, key) => String(fd.get(key) || '').trim();
  const nullable = (v) => v || null;
  const urlOrNull = (v) => {
    if (!v) return null;
    try { return new URL(v).toString(); } catch { return null; }
  };

  const safeDecode = (value='') => {
    try { return decodeURIComponent(value); } catch { return value; }
  };

  const identityKey = (value='') => safeDecode(String(value))
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

  const profileSourceLabel = (kind) => ({
    raiderio: 'Raider.IO',
    wcl: 'Warcraft Logs',
    armory: 'Armory'
  }[kind] || 'Profile');

  function parseCharacterProfile(kind, raw) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      return { ok:false, message:`Enter a valid ${profileSourceLabel(kind)} URL.` };
    }

    if (url.protocol !== 'https:') {
      return { ok:false, message:`Use the HTTPS ${profileSourceLabel(kind)} character profile URL.` };
    }

    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean).map(safeDecode);
    let marker = '';
    let validHost = false;

    if (kind === 'raiderio') {
      validHost = host === 'raider.io' || host === 'www.raider.io';
      marker = 'characters';
    } else if (kind === 'wcl') {
      validHost = host === 'warcraftlogs.com' || host === 'www.warcraftlogs.com';
      marker = 'character';
    } else if (kind === 'armory') {
      validHost = host === 'worldofwarcraft.blizzard.com';
      marker = 'character';
    }

    if (!validHost) {
      return { ok:false, message:`Use a direct ${profileSourceLabel(kind)} character profile URL.` };
    }

    const markerIndex = segments.findIndex(segment => segment.toLowerCase() === marker);
    if (markerIndex < 0 || segments.length < markerIndex + 4) {
      return { ok:false, message:`Use a direct ${profileSourceLabel(kind)} character profile URL, not a homepage, guild page or search result.` };
    }

    return {
      ok:true,
      url:url.toString(),
      region:segments[markerIndex + 1],
      realm:segments[markerIndex + 2],
      character:segments[markerIndex + 3]
    };
  }

  function validateCharacterProfiles() {
    profileInputList.forEach(input => input.setCustomValidity(''));

    const entered = Object.entries(profileInputs)
      .filter(([, input]) => input && input.value.trim());

    if (!entered.length) {
      profileInputs.raiderio?.setCustomValidity(
        'Add at least one direct character profile: Raider.IO, Warcraft Logs, or Armory.'
      );
      return false;
    }

    const expected = {
      character: identityKey(characterInput?.value || ''),
      realm: identityKey(realmInput?.value || ''),
      region: String(regionSelect?.value || '').trim().toLowerCase()
    };

    if (!expected.character || !expected.realm || !expected.region) return false;

    let valid = true;

    for (const [kind, input] of entered) {
      const parsed = parseCharacterProfile(kind, input.value.trim());
      if (!parsed.ok) {
        input.setCustomValidity(parsed.message);
        valid = false;
        continue;
      }

      const matches =
        String(parsed.region || '').toLowerCase() === expected.region &&
        identityKey(parsed.realm) === expected.realm &&
        identityKey(parsed.character) === expected.character;

      if (!matches) {
        input.setCustomValidity(
          `${profileSourceLabel(kind)} must point to ${characterInput.value.trim()} on ${realmInput.value.trim()} (${regionSelect.value}).`
        );
        valid = false;
      }
    }

    return valid;
  }

  const option = (value, label=value) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    return opt;
  };

  function populateRealmOptions({ clearRealm = false } = {}) {
    const region = regionSelect?.value || 'EU';
    const realms = REALMS[region] || [];

    realmOptions.innerHTML = '';
    realms
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .forEach(realm => realmOptions.append(option(realm)));

    if (clearRealm && realmInput) realmInput.value = '';

    if (realmInput) {
      realmInput.placeholder = realms.length
        ? 'Start typing your realm…'
        : 'Type your realm name…';
    }
  }

  function resetSpecSelects() {
    mainSpecSelect.innerHTML = '';
    offSpecSelect.innerHTML = '';

    const className = classSelect.value;
    const specs = CLASS_SPECS[className] || [];

    if (!specs.length) {
      mainSpecSelect.append(option('', 'Choose class first'));
      offSpecSelect.append(option('', 'Choose class first'));
      mainSpecSelect.disabled = true;
      offSpecSelect.disabled = true;
      return;
    }

    mainSpecSelect.append(option('', 'Choose main spec'));
    specs.forEach(spec => mainSpecSelect.append(option(spec)));
    mainSpecSelect.disabled = false;

    offSpecSelect.append(option('', 'No off-spec / not selected'));
    specs.forEach(spec => offSpecSelect.append(option(spec)));
    offSpecSelect.disabled = false;
  }

  function updateOffSpecOptions() {
    const mainSpec = mainSpecSelect.value;

    [...offSpecSelect.options].forEach(opt => {
      if (!opt.value) return;
      opt.disabled = opt.value === mainSpec;
    });

    if (offSpecSelect.value === mainSpec) {
      offSpecSelect.value = '';
    }
  }

  function updateProfessionOptions() {
    const p1 = profession1.value;
    const p2 = profession2.value;

    [...profession1.options].forEach(opt => {
      if (!opt.value) return;
      opt.disabled = opt.value === p2;
    });

    [...profession2.options].forEach(opt => {
      if (!opt.value) return;
      opt.disabled = opt.value === p1;
    });

    if (p1 && p1 === p2) {
      profession2.value = '';
    }
  }

  function selectedInterests() {
    return interestBoxes.filter(box => box.checked).map(box => box.value);
  }

  function validateInterests() {
    const first = interestBoxes[0];
    if (!first) return true;

    const valid = selectedInterests().length > 0;
    first.setCustomValidity(valid ? '' : 'Select at least one: Casual / Social, Raiding, or Mythic+.');
    return valid;
  }

  regionSelect?.addEventListener('change', () => populateRealmOptions({ clearRealm: true }));

  classSelect.addEventListener('change', () => {
    resetSpecSelects();
    updateOffSpecOptions();
  });

  mainSpecSelect.addEventListener('change', updateOffSpecOptions);
  profession1.addEventListener('change', updateProfessionOptions);
  profession2.addEventListener('change', updateProfessionOptions);
  interestBoxes.forEach(box => box.addEventListener('change', validateInterests));
  profileInputList.forEach(input => input.addEventListener('input', validateCharacterProfiles));
  characterInput?.addEventListener('input', validateCharacterProfiles);
  realmInput?.addEventListener('input', validateCharacterProfiles);
  regionSelect?.addEventListener('change', validateCharacterProfiles);

  populateRealmOptions();
  resetSpecSelects();
  updateProfessionOptions();


  function turnstileConfigured() {
    return securityCfg.turnstileSiteKey &&
      !securityCfg.turnstileSiteKey.startsWith('PASTE_');
  }

  function bootTurnstile(attempts = 0) {
    if (!turnstileConfigured()) {
      show(
        backendNotice,
        'Recruitment spam protection is not configured yet. Add the Cloudflare Turnstile site key in assets/security-config.js.',
        'error'
      );
      submitBtn.disabled = true;
      return;
    }

    if (!window.turnstile) {
      if (attempts < 40) {
        window.setTimeout(() => bootTurnstile(attempts + 1), 150);
      } else {
        show(
          backendNotice,
          'The anti-spam security check could not load. Please refresh the page.',
          'error'
        );
        submitBtn.disabled = true;
      }
      return;
    }

    if (turnstileWidgetId !== null) return;

    turnstileWidgetId = window.turnstile.render('#turnstileWidget', {
      sitekey: securityCfg.turnstileSiteKey,
      theme: 'dark',
      callback: token => {
        turnstileToken = token;
      },
      'expired-callback': () => {
        turnstileToken = '';
      },
      'error-callback': () => {
        turnstileToken = '';
      }
    });
  }

  bootTurnstile();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.hidden = true;

    if (!configured || !client) return;

    validateInterests();
    validateCharacterProfiles();
    if (!form.reportValidity()) return;

    if (!turnstileToken) {
      show(
        msg,
        'Please complete the anti-spam security check before submitting.',
        'error'
      );
      return;
    }

    const fd = new FormData(form);
    if (value(fd, 'website')) return; // honeypot

    const autoRole = inferredRole(value(fd, 'class_name'), value(fd, 'main_spec'));
    if (!autoRole) {
      show(
        msg,
        'We could not determine the role for the selected main spec. Please reselect your class and main spec.',
        'error'
      );
      return;
    }

    const payload = {
      character_name: value(fd, 'character_name'),
      realm: value(fd, 'realm'),
      region: value(fd, 'region'),
      class_name: value(fd, 'class_name'),
      main_spec: value(fd, 'main_spec'),
      role: autoRole,
      faction: value(fd, 'faction'),
      off_specs: nullable(value(fd, 'off_specs')),
      item_level: value(fd, 'item_level') ? Number(value(fd, 'item_level')) : null,

      profession_1: nullable(value(fd, 'profession_1')),
      profession_2: nullable(value(fd, 'profession_2')),
      interests: selectedInterests(),

      raiderio_url: urlOrNull(value(fd, 'raiderio_url')),
      wcl_url: urlOrNull(value(fd, 'wcl_url')),
      armory_url: urlOrNull(value(fd, 'armory_url')),
      current_progression: nullable(value(fd, 'current_progression')),
      raid_experience: nullable(value(fd, 'raid_experience')),
      mplus_experience: nullable(value(fd, 'mplus_experience')),
      available_wed: fd.has('available_wed'),
      available_thu: fd.has('available_thu'),
      attendance_notes: nullable(value(fd, 'attendance_notes')),
      discord_contact: value(fd, 'discord_contact'),
      battle_tag: nullable(value(fd, 'battle_tag')),
      why_odit: value(fd, 'why_odit'),
      about_you: nullable(value(fd, 'about_you')),
      privacy_consent: fd.has('privacy_consent')
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    const functionName = securityCfg.submitFunction || 'submit-application';
    const { data, error } = await client.functions.invoke(functionName, {
      body: {
        payload,
        turnstileToken
      }
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Application';

    if (error || !data?.ok) {
      console.error(error || data);

      if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.reset(turnstileWidgetId);
      }
      turnstileToken = '';

      show(
        msg,
        data?.message ||
          'We could not submit the application. Please try again or contact an ODit officer on Discord.',
        'error'
      );
      return;
    }

    form.reset();
    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId);
    }
    turnstileToken = '';
    populateRealmOptions();
    resetSpecSelects();
    updateProfessionOptions();
    validateInterests();

    show(
      msg,
      'Application submitted. An ODit officer can now review it in the Officer Portal.',
      'success'
    );
    msg.scrollIntoView({behavior:'smooth', block:'center'});
  });
})();
