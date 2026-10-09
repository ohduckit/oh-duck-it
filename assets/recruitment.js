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
    armory: 'WoW Armory'
  }[kind] || 'Profile');

  const profileStatusEls = {
    raiderio: document.getElementById('raiderioValidation'),
    wcl: document.getElementById('wclValidation'),
    armory: document.getElementById('armoryValidation')
  };
  const profileSummary = document.getElementById('profileValidationSummary');

  function setProfileStatus(kind, state='', text='') {
    const input = profileInputs[kind];
    const status = profileStatusEls[kind];
    if (!input || !status) return;

    input.classList.remove('profile-invalid', 'profile-valid', 'profile-warning');
    status.className = 'profile-field-status';

    if (state === 'error') {
      input.classList.add('profile-invalid');
      status.classList.add('error');
    } else if (state === 'success') {
      input.classList.add('profile-valid');
      status.classList.add('success');
    } else if (state === 'warning') {
      input.classList.add('profile-warning');
      status.classList.add('warning');
    }

    status.textContent = text;
  }

  function setProfileSummary(state='', text='') {
    if (!profileSummary) return;
    profileSummary.hidden = !text;
    profileSummary.className = 'profile-validation-summary';
    if (state) profileSummary.classList.add(state);
    profileSummary.textContent = text;
  }

  function parseCharacterProfile(kind, raw) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      return { ok:false, state:'invalid', message:`Enter a valid ${profileSourceLabel(kind)} URL.` };
    }

    if (url.protocol !== 'https:') {
      return { ok:false, state:'invalid', message:`Use the HTTPS ${profileSourceLabel(kind)} character profile URL.` };
    }

    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean).map(safeDecode);

    if (kind === 'raiderio') {
      if (host !== 'raider.io' && host !== 'www.raider.io') {
        return { ok:false, state:'invalid', message:'Use a direct Raider.IO character profile URL.' };
      }

      const i = segments.findIndex(s => s.toLowerCase() === 'characters');
      if (i < 0 || segments.length < i + 4) {
        return { ok:false, state:'invalid', message:'Use the character profile, not a Raider.IO guild, search or homepage link.' };
      }

      return {
        ok:true,
        state:'verifiable',
        url:url.toString(),
        region:segments[i + 1],
        realm:segments[i + 2],
        character:segments[i + 3]
      };
    }

    if (kind === 'armory') {
      if (host !== 'worldofwarcraft.blizzard.com') {
        return { ok:false, state:'invalid', message:'Use a direct World of Warcraft Armory character profile URL.' };
      }

      // Current format:
      // /en-gb/worldsoul/eu/armory/character/stormscale/dazrynne
      const armoryIndex = segments.findIndex(s => s.toLowerCase() === 'armory');
      const characterIndex = segments.findIndex((s, idx) =>
        idx > armoryIndex && s.toLowerCase() === 'character'
      );

      if (armoryIndex >= 1 && characterIndex >= 0 && segments.length >= characterIndex + 3) {
        return {
          ok:true,
          state:'verifiable',
          url:url.toString(),
          region:segments[armoryIndex - 1],
          realm:segments[characterIndex + 1],
          character:segments[characterIndex + 2]
        };
      }

      // Legacy format:
      // /en-gb/character/eu/stormscale/dazrynne
      const legacyIndex = segments.findIndex(s => s.toLowerCase() === 'character');
      if (legacyIndex >= 0 && segments.length >= legacyIndex + 4) {
        return {
          ok:true,
          state:'verifiable',
          url:url.toString(),
          region:segments[legacyIndex + 1],
          realm:segments[legacyIndex + 2],
          character:segments[legacyIndex + 3]
        };
      }

      return { ok:false, state:'invalid', message:'Use the direct WoW Armory character page, not an Armory search page.' };
    }

    if (kind === 'wcl') {
      if (host !== 'warcraftlogs.com' && host !== 'www.warcraftlogs.com') {
        return { ok:false, state:'invalid', message:'Use a Warcraft Logs character profile URL.' };
      }

      const i = segments.findIndex(s => s.toLowerCase() === 'character');
      if (i < 0) {
        return { ok:false, state:'invalid', message:'Use a Warcraft Logs character profile, not a report, guild or homepage link.' };
      }

      // Name-bearing WCL format: /character/eu/realm/character
      if (segments.length >= i + 4 && segments[i + 1].toLowerCase() !== 'id') {
        return {
          ok:true,
          state:'verifiable',
          url:url.toString(),
          region:segments[i + 1],
          realm:segments[i + 2],
          character:segments[i + 3]
        };
      }

      // Current WCL can also use /character/id/12345678. It is a legitimate
      // character link, but the identity cannot be proven from the URL alone.
      if (
        segments.length >= i + 3 &&
        segments[i + 1].toLowerCase() === 'id' &&
        /^\d+$/.test(segments[i + 2])
      ) {
        return {
          ok:true,
          state:'supporting',
          url:url.toString(),
          message:'Valid Warcraft Logs character link. Because it uses a numeric ID, Raider.IO or WoW Armory is also required so we can verify the character name and realm.'
        };
      }

      return { ok:false, state:'invalid', message:'Use the direct Warcraft Logs character profile.' };
    }

    return { ok:false, state:'invalid', message:'Unsupported character profile.' };
  }

  function validateCharacterProfiles({ announce = false } = {}) {
    profileInputList.forEach(input => input.setCustomValidity(''));
    Object.keys(profileInputs).forEach(kind => setProfileStatus(kind));

    const entered = Object.entries(profileInputs)
      .filter(([, input]) => input && input.value.trim());

    if (!entered.length) {
      const text = 'Add at least one direct character profile: Raider.IO, Warcraft Logs, or WoW Armory.';
      profileInputs.raiderio?.setCustomValidity(text);
      setProfileStatus('raiderio', 'error', text);
      setProfileSummary('error', text);
      return false;
    }

    const expected = {
      character: identityKey(characterInput?.value || ''),
      realm: identityKey(realmInput?.value || ''),
      region: String(regionSelect?.value || '').trim().toLowerCase()
    };

    if (!expected.character || !expected.realm || !expected.region) {
      setProfileSummary('error', 'Enter the character name, realm and region before adding verification profiles.');
      return false;
    }

    let valid = true;
    let verifiedMatches = 0;
    const supportingKinds = [];
    let firstProblem = null;

    for (const [kind, input] of entered) {
      const parsed = parseCharacterProfile(kind, input.value.trim());

      if (!parsed.ok) {
        input.setCustomValidity(parsed.message);
        setProfileStatus(kind, 'error', `✕ ${parsed.message}`);
        firstProblem ||= input;
        valid = false;
        continue;
      }

      if (parsed.state === 'supporting') {
        supportingKinds.push(kind);
        setProfileStatus(kind, 'warning', `⚠ ${parsed.message}`);
        continue;
      }

      const matches =
        String(parsed.region || '').toLowerCase() === expected.region &&
        identityKey(parsed.realm) === expected.realm &&
        identityKey(parsed.character) === expected.character;

      if (!matches) {
        const text =
          `${profileSourceLabel(kind)} points to ${parsed.character || 'another character'} on ${parsed.realm || 'another realm'} (${String(parsed.region || '').toUpperCase()}), ` +
          `but the application is for ${characterInput.value.trim()} on ${realmInput.value.trim()} (${regionSelect.value}).`;
        input.setCustomValidity(text);
        setProfileStatus(kind, 'error', `✕ ${text}`);
        firstProblem ||= input;
        valid = false;
        continue;
      }

      verifiedMatches += 1;
      setProfileStatus(
        kind,
        'success',
        `✓ Matches ${characterInput.value.trim()} — ${realmInput.value.trim()} (${regionSelect.value})`
      );
    }

    if (valid && supportingKinds.length && verifiedMatches < 1) {
      const kind = supportingKinds[0];
      const input = profileInputs[kind];
      const text =
        'This Warcraft Logs link uses a numeric character ID, so its name and realm cannot be verified from the URL. Add a matching Raider.IO or WoW Armory profile as well.';
      input.setCustomValidity(text);
      setProfileStatus(kind, 'error', `✕ ${text}`);
      firstProblem ||= input;
      valid = false;
    }

    if (valid) {
      setProfileSummary(
        'success',
        supportingKinds.length
          ? `Character verified. ${profileSourceLabel(supportingKinds[0])} is being kept as a supporting profile.`
          : `Character verified as ${characterInput.value.trim()} — ${realmInput.value.trim()} (${regionSelect.value}).`
      );
    } else {
      setProfileSummary(
        'error',
        'Character verification needs attention. Fix the red field(s) below before submitting.'
      );
      if (announce && firstProblem) {
        firstProblem.scrollIntoView({ behavior:'smooth', block:'center' });
        window.setTimeout(() => firstProblem.focus({ preventScroll:true }), 350);
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
    const profilesValid = validateCharacterProfiles({ announce: true });

    if (!form.checkValidity() || !profilesValid) {
      const firstInvalid = form.querySelector(':invalid');
      show(
        msg,
        'Your application has not been submitted. Please correct the highlighted field(s) and try again.',
        'error'
      );

      if (firstInvalid && !profileInputList.includes(firstInvalid)) {
        firstInvalid.scrollIntoView({behavior:'smooth', block:'center'});
        window.setTimeout(() => {
          firstInvalid.focus({preventScroll:true});
          firstInvalid.reportValidity();
        }, 350);
      }
      return;
    }

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
