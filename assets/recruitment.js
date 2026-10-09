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
    armory: document.getElementById('armory_url')
  };
  const profileInputList = Object.values(profileInputs).filter(Boolean);
  const factionSelect = document.getElementById('faction');
  const itemLevelInput = document.getElementById('item_level');
  const verifiedCharacterDetails = document.getElementById('verifiedCharacterDetails');
  const characterProfileVerification = document.getElementById('characterProfileVerification');
  const battleNetActiveSpecInput = document.getElementById('bnet_active_spec');
  const bnetCharacterDialog = document.getElementById('bnetCharacterDialog');
  const bnetCharacterList = document.getElementById('bnetCharacterList');
  const bnetCharacterSearch = document.getElementById('bnetCharacterSearch');
  const bnetCharacterEmpty = document.getElementById('bnetCharacterEmpty');
  const closeBnetDialog = document.getElementById('closeBnetDialog');
  const BNET_VERIFIED_KEY = 'odit-recruitment-bnet-verified-v2';
  let battleNetCharacterSession = '';
  let battleNetCharacters = [];
  const battleNetVerifyBtn = document.getElementById('battleNetVerifyBtn');
  const battleNetStatus = document.getElementById('battleNetVerificationStatus');
  const BNET_DRAFT_KEY = 'odit-recruitment-bnet-draft-v1';
  let battleNetVerificationToken = '';
  let battleNetVerifiedIdentity = null;

  const discordVerifyBtn = document.getElementById('discordVerifyBtn');
  const discordVerification = document.getElementById('discordVerification');
  const discordStatus = document.getElementById('discordVerificationStatus');
  const discordContactInput = document.getElementById('discord_contact');
  const discordGlobalNameInput = document.getElementById('discord_global_name');
  const discordUserIdInput = document.getElementById('discord_user_id');
  const DISCORD_VERIFIED_KEY = 'odit-recruitment-discord-verified-v1';
  let discordVerificationToken = '';
  let discordVerifiedIdentity = null;

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

  // Escape Battle.net character data before rendering it inside the picker.
  // v2.2 called esc(...) in renderBattleNetCharacters() but did not define it,
  // which stopped the modal from rendering after the character list loaded.
  const esc = (value='') => String(value).replace(/[&<>'"]/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    "'":'&#39;',
    '"':'&quot;'
  }[c]));

  const profileSourceLabel = (kind) => ({
    raiderio: 'Raider.IO',
    armory: 'WoW Armory'
  }[kind] || 'Profile');

  const profileStatusEls = {
    raiderio: document.getElementById('raiderioValidation'),
    armory: document.getElementById('armoryValidation')
  };
  const profileGroupValidation = document.getElementById('profileGroupValidation');

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
    }

    status.textContent = text;
  }

  function setProfileGroupValidation(text='', state='') {
    if (!profileGroupValidation) return;
    profileGroupValidation.textContent = text;
    profileGroupValidation.className = 'profile-group-validation';
    if (state) profileGroupValidation.classList.add(state);
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
    const lower = segments.map(s => s.toLowerCase());

    if (kind === 'raiderio') {
      if (host !== 'raider.io' && host !== 'www.raider.io') {
        return { ok:false, state:'invalid', message:'Use a direct Raider.IO character profile URL.' };
      }

      const i = lower.findIndex(s => s === 'characters');
      if (i < 0 || segments.length < i + 4) {
        return { ok:false, state:'invalid', message:'Use the Raider.IO character page, not a guild, search or homepage link.' };
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

      // Be deliberately tolerant of Blizzard changing the route around the
      // stable ".../character/<realm>/<character>" tail.
      const characterIndex = lower.lastIndexOf('character');
      if (characterIndex >= 0 && segments.length >= characterIndex + 3) {
        const realm = segments[characterIndex + 1];
        const character = segments[characterIndex + 2];

        const allowedRegions = ['eu','us','kr','tw'];
        let region = '';

        // Find the closest region segment that appears before /character/.
        for (let i = characterIndex - 1; i >= 0; i--) {
          const candidate = lower[i];
          if (allowedRegions.includes(candidate)) {
            region = segments[i];
            break;
          }
        }

        if (region && realm && character) {
          return {
            ok:true,
            state:'verifiable',
            url:url.toString(),
            region,
            realm,
            character
          };
        }
      }

      return {
        ok:false,
        state:'invalid',
        message:'Use the direct WoW Armory character page. It should end in /character/<realm>/<character>.'
      };
    }

    return { ok:false, state:'invalid', message:'Unsupported character profile.' };
  }

  function clearProfileFeedback(kind) {
    const input = profileInputs[kind];
    if (input) input.setCustomValidity('');
    setProfileStatus(kind);
  }

  function clearProfileFeedback(kind) {
    const input = profileInputs[kind];
    if (input) input.setCustomValidity('');
    setProfileStatus(kind);
  }

  function validateCharacterProfiles({ announce = false } = {}) {
    profileInputList.forEach(input => input.setCustomValidity(''));
    Object.keys(profileInputs).forEach(kind => setProfileStatus(kind));
    setProfileGroupValidation();

    const entered = Object.entries(profileInputs)
      .filter(([, input]) => input && input.value.trim());

    if (!entered.length) {
      setProfileGroupValidation(
        'Add either a Raider.IO or WoW Armory character profile before submitting.',
        'error'
      );
      if (announce) {
        document.getElementById('characterProfileVerification')?.scrollIntoView({
          behavior:'smooth',
          block:'center'
        });
      }
      return false;
    }

    const expected = {
      character: identityKey(characterInput?.value || ''),
      realm: identityKey(realmInput?.value || ''),
      region: String(regionSelect?.value || '').trim().toLowerCase()
    };

    if (!expected.character || !expected.realm || !expected.region) {
      setProfileGroupValidation(
        'Enter the character name, realm and region first.',
        'error'
      );
      return false;
    }

    let valid = true;
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

      const matches =
        String(parsed.region || '').toLowerCase() === expected.region &&
        identityKey(parsed.realm) === expected.realm &&
        identityKey(parsed.character) === expected.character;

      if (!matches) {
        const text =
          `${profileSourceLabel(kind)} is for ${parsed.character || 'another character'} on ${parsed.realm || 'another realm'} (${String(parsed.region || '').toUpperCase()}), ` +
          `but this application is for ${characterInput.value.trim()} on ${realmInput.value.trim()} (${regionSelect.value}).`;
        input.setCustomValidity(text);
        setProfileStatus(kind, 'error', `✕ ${text}`);
        firstProblem ||= input;
        valid = false;
        continue;
      }

      setProfileStatus(
        kind,
        'success',
        `✓ Matches ${characterInput.value.trim()} — ${realmInput.value.trim()} (${regionSelect.value})`
      );
    }

    if (announce && firstProblem) {
      firstProblem.scrollIntoView({behavior:'smooth', block:'center'});
      window.setTimeout(() => firstProblem.focus({preventScroll:true}), 350);
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
      if (realmInput.readOnly) {
        realmInput.placeholder = 'Filled by Battle.net';
      } else {
        realmInput.placeholder = realms.length
          ? 'Start typing your realm…'
          : 'Type your realm name…';
      }
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
  battleNetVerifyBtn?.addEventListener('click', beginBattleNetVerification);
  discordVerifyBtn?.addEventListener('click', beginDiscordVerification);
  closeBnetDialog?.addEventListener('click', () => bnetCharacterDialog?.close());
  bnetCharacterSearch?.addEventListener('input', renderBattleNetCharacters);

  bnetCharacterDialog?.addEventListener('click', event => {
    if (event.target === bnetCharacterDialog) {
      bnetCharacterDialog.close();
    }
  });

  regionSelect?.addEventListener('change', () => {
    if (battleNetVerificationToken || battleNetVerifiedIdentity) {
      clearBattleNetVerification(
        'Region changed — choose your Battle.net character again.',
        { clearCharacter: true }
      );
    }
  });


  populateRealmOptions();
  mainSpecSelect.innerHTML = '<option value="">Choose character first</option>';
  mainSpecSelect.disabled = true;
  offSpecSelect.innerHTML = '<option value="">Choose character first</option>';
  offSpecSelect.disabled = true;
  updateProfessionOptions();
  restoreRecruitmentDraft();


  function setBattleNetStatus(state, text) {
    if (!battleNetStatus) return;
    battleNetStatus.className = 'bnet-verification-status';
    if (state) battleNetStatus.classList.add(state);
    battleNetStatus.textContent = text;
  }

  function recruitmentDraft() {
    const fields = {};
    [...form.elements].forEach(el => {
      if (!el.name || el.name === 'website') return;

      if (el.type === 'checkbox') {
        fields[el.name] = el.checked;
      } else {
        fields[el.name] = el.value;
      }
    });
    return fields;
  }

  function saveRecruitmentDraft() {
    try {
      sessionStorage.setItem(BNET_DRAFT_KEY, JSON.stringify(recruitmentDraft()));
    } catch (err) {
      console.warn('Could not save recruitment draft before Battle.net verification:', err);
    }
  }

  function restoreRecruitmentDraft() {
    let draft;
    try {
      const raw = sessionStorage.getItem(BNET_DRAFT_KEY);
      if (!raw) return;
      draft = JSON.parse(raw);
    } catch {
      return;
    }

    if (!draft || typeof draft !== 'object') return;

    const battleNetFields = new Set([
      'character_name','realm','class_name','main_spec','faction','item_level',
      'raiderio_url','armory_url'
    ]);

    [...form.elements].forEach(el => {
      if (!el.name || battleNetFields.has(el.name) || !(el.name in draft)) return;

      if (el.type === 'checkbox') {
        el.checked = draft[el.name] === true;
      } else if (!el.disabled) {
        el.value = draft[el.name] ?? '';
      }
    });

    updateProfessionOptions();
    validateInterests();
  }

  function currentCharacterIdentity() {
    return {
      character: String(characterInput?.value || '').trim(),
      realm: String(realmInput?.value || '').trim(),
      region: String(regionSelect?.value || '').trim().toUpperCase()
    };
  }

  function clearAutoFilledCharacter() {
    if (characterInput) characterInput.value = '';
    if (realmInput) realmInput.value = '';
    if (classSelect) classSelect.value = '';
    if (battleNetActiveSpecInput) battleNetActiveSpecInput.value = '';
    if (factionSelect) factionSelect.value = '';
    if (itemLevelInput) itemLevelInput.value = '';

    if (mainSpecSelect) {
      mainSpecSelect.innerHTML = '<option value="">Choose character first</option>';
      mainSpecSelect.value = '';
      mainSpecSelect.disabled = true;
    }

    if (offSpecSelect) {
      offSpecSelect.innerHTML = '<option value="">Choose character first</option>';
      offSpecSelect.disabled = true;
    }

    profileInputList.forEach(input => {
      input.value = '';
      input.setCustomValidity('');
    });

    verifiedCharacterDetails?.classList.remove('verified');
    characterProfileVerification?.classList.remove('verified');
  }

  function clearBattleNetVerification(reason = '', { clearCharacter = false } = {}) {
    battleNetVerificationToken = '';
    battleNetVerifiedIdentity = null;

    try {
      sessionStorage.removeItem(BNET_VERIFIED_KEY);
    } catch {}

    if (clearCharacter) clearAutoFilledCharacter();

    if (reason) {
      setBattleNetStatus('warning', reason);
    } else {
      setBattleNetStatus('', 'No character selected yet.');
    }

    if (battleNetVerifyBtn) {
      battleNetVerifyBtn.textContent = 'Choose character with Battle.net';
    }
  }

  function verificationMatchesCurrentCharacter(identity) {
    const current = currentCharacterIdentity();
    return (
      identity &&
      identityKey(identity.character || '') === identityKey(current.character) &&
      identityKey(identity.realm || '') === identityKey(current.realm) &&
      String(identity.region || '').toUpperCase() === current.region
    );
  }

  function applyVerifiedCharacter(data) {
    if (regionSelect) regionSelect.value = data.region || 'EU';
    if (characterInput) characterInput.value = data.character || '';
    if (realmInput) realmInput.value = data.realm || '';
    if (battleNetActiveSpecInput) battleNetActiveSpecInput.value = data.active_spec || '';

    if (classSelect) {
      classSelect.value = data.class_name || '';
      resetSpecSelects();
    }

    // "Applying as" defaults to the active Battle.net spec but stays editable
    // within the verified character's class.
    if (mainSpecSelect) {
      const availableSpecs = CLASS_SPECS[data.class_name] || [];
      const preferred = availableSpecs.includes(data.active_spec)
        ? data.active_spec
        : '';
      mainSpecSelect.value = preferred;
      mainSpecSelect.disabled = false;
      updateOffSpecOptions();
    }

    if (factionSelect) factionSelect.value = data.faction || '';
    if (itemLevelInput) {
      itemLevelInput.value =
        data.item_level === null || data.item_level === undefined
          ? ''
          : String(data.item_level);
    }

    if (profileInputs.raiderio) profileInputs.raiderio.value = data.raiderio_url || '';
    if (profileInputs.armory) profileInputs.armory.value = data.armory_url || '';

    verifiedCharacterDetails?.classList.add('verified');
    characterProfileVerification?.classList.add('verified');

    if (battleNetVerifyBtn) {
      battleNetVerifyBtn.textContent = 'Choose a different character';
    }
  }

  function characterSearchText(item) {
    return [
      item.name,
      item.realm_name,
      item.class_name,
      item.faction,
      item.level
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function renderBattleNetCharacters() {
    if (!bnetCharacterList) return;

    const query = String(bnetCharacterSearch?.value || '').trim().toLowerCase();
    const visible = battleNetCharacters.filter(item =>
      !query || characterSearchText(item).includes(query)
    );

    bnetCharacterList.innerHTML = visible.map((item, index) => `
      <button
        class="bnet-character-card"
        type="button"
        data-character-index="${battleNetCharacters.indexOf(item)}"
      >
        <span class="bnet-character-main">
          <strong>${esc(item.name)}</strong>
          <span>${esc(item.realm_name)}</span>
        </span>
        <span class="bnet-character-meta">
          ${item.class_name ? `<span>${esc(item.class_name)}</span>` : ''}
          ${item.faction ? `<span>${esc(item.faction)}</span>` : ''}
          ${item.level ? `<span>Level ${esc(item.level)}</span>` : ''}
        </span>
        <span class="bnet-character-choose">Choose →</span>
      </button>
    `).join('');

    if (bnetCharacterEmpty) bnetCharacterEmpty.hidden = visible.length > 0;

    bnetCharacterList.querySelectorAll('.bnet-character-card').forEach(button => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.characterIndex);
        const item = battleNetCharacters[index];
        if (item) selectBattleNetCharacter(item);
      });
    });
  }

  function openBattleNetCharacterDialog() {
    try {
      renderBattleNetCharacters();

      if (!bnetCharacterDialog) {
        throw new Error('Battle.net character dialog is missing from the page.');
      }

      if (typeof bnetCharacterDialog.showModal === 'function') {
        if (!bnetCharacterDialog.open) bnetCharacterDialog.showModal();
      } else {
        bnetCharacterDialog.setAttribute('open', '');
      }

      window.setTimeout(() => bnetCharacterSearch?.focus(), 50);
    } catch (error) {
      console.error('Could not open Battle.net character picker:', error);
      setBattleNetStatus(
        'error',
        'Your Battle.net characters were loaded, but the character picker could not open. Please refresh the page and try again.'
      );
    }
  }

  async function loadBattleNetCharacterSession(sessionToken) {
    if (!client || !sessionToken) return;

    battleNetCharacterSession = sessionToken;
    setBattleNetStatus('info', 'Loading characters from your Battle.net account…');

    const { data, error } = await client.functions.invoke('battlenet-verify', {
      body: {
        action: 'list',
        session_token: sessionToken
      }
    });

    if (error || !data?.ok || !Array.isArray(data.characters)) {
      console.error(error || data);
      battleNetCharacterSession = '';
      setBattleNetStatus(
        'error',
        data?.message || 'Your Battle.net character list could not be loaded. Please try again.'
      );
      return;
    }

    battleNetCharacters = data.characters;
    setBattleNetStatus(
      'info',
      `Battle.net account verified. Choose the character you want to apply with.`
    );
    openBattleNetCharacterDialog();
  }

  async function selectBattleNetCharacter(item) {
    if (!client || !battleNetCharacterSession) return;

    bnetCharacterList?.querySelectorAll('button').forEach(button => {
      button.disabled = true;
    });

    setBattleNetStatus('info', `Loading ${item.name} — ${item.realm_name} from Battle.net…`);

    const { data, error } = await client.functions.invoke('battlenet-verify', {
      body: {
        action: 'select',
        session_token: battleNetCharacterSession,
        character: item.name,
        realm_slug: item.realm_slug
      }
    });

    if (error || !data?.ok || !data?.verified || !data?.token) {
      console.error(error || data);
      setBattleNetStatus(
        'error',
        data?.message || 'That character could not be selected. Please try again.'
      );
      renderBattleNetCharacters();
      return;
    }

    battleNetVerificationToken = data.token;
    battleNetVerifiedIdentity = {
      character: data.character,
      realm: data.realm,
      region: data.region
    };

    applyVerifiedCharacter(data);

    try {
      sessionStorage.setItem(BNET_VERIFIED_KEY, data.token);
    } catch {}

    setBattleNetStatus(
      'success',
      `✓ Battle.net verified ${data.character} — ${data.realm} (${data.region}). Character details filled automatically.`
    );

    battleNetCharacterSession = '';
    battleNetCharacters = [];
    bnetCharacterSearch.value = '';
    bnetCharacterDialog?.close();
  }

  async function restoreBattleNetVerification() {
    let token = '';
    try {
      token = sessionStorage.getItem(BNET_VERIFIED_KEY) || '';
    } catch {}

    if (!token || !client) return;

    const { data, error } = await client.functions.invoke('battlenet-verify', {
      body: { action: 'status', token }
    });

    if (error || !data?.ok || !data?.verified) {
      try { sessionStorage.removeItem(BNET_VERIFIED_KEY); } catch {}
      return;
    }

    battleNetVerificationToken = token;
    battleNetVerifiedIdentity = {
      character: data.character,
      realm: data.realm,
      region: data.region
    };
    applyVerifiedCharacter(data);

    setBattleNetStatus(
      'success',
      `✓ Battle.net verified ${data.character} — ${data.realm} (${data.region}).`
    );
  }

  async function beginBattleNetVerification() {
    if (!client) return;

    const region = String(regionSelect?.value || '').trim().toUpperCase();
    if (!region) {
      setBattleNetStatus('error', 'Choose your Battle.net region first.');
      regionSelect?.focus();
      return;
    }

    saveRecruitmentDraft();
    setBattleNetStatus('info', 'Opening Battle.net secure sign-in…');
    battleNetVerifyBtn.disabled = true;

    const { data, error } = await client.functions.invoke('battlenet-verify', {
      body: {
        action: 'start',
        region
      }
    });

    battleNetVerifyBtn.disabled = false;

    if (error || !data?.ok || !data?.authorizeUrl) {
      console.error(error || data);
      setBattleNetStatus(
        'error',
        data?.message || 'Battle.net verification could not start. Please try again.'
      );
      return;
    }

    window.location.assign(data.authorizeUrl);
  }

  async function handleBattleNetReturn() {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('bnet');
    const sessionToken = params.get('bnet_session');
    const reason = params.get('bnet_reason');

    if (!result && !sessionToken && !reason) {
      await restoreBattleNetVerification();
      return;
    }

    const cleanUrl = `${window.location.pathname}${window.location.hash || '#apply'}`;
    history.replaceState(null, '', cleanUrl);

    if (result === 'characters' && sessionToken) {
      await loadBattleNetCharacterSession(sessionToken);
      return;
    }

    if (result === 'cancelled') {
      setBattleNetStatus('warning', 'Battle.net verification was cancelled.');
      return;
    }

    setBattleNetStatus(
      'error',
      reason || 'Battle.net verification could not be completed. Please try again.'
    );
  }


  function setDiscordStatus(state, text) {
    if (!discordStatus) return;
    discordStatus.className = 'discord-verification-status';
    if (state) discordStatus.classList.add(state);
    discordStatus.textContent = text;
  }

  function clearDiscordVerification(reason = '') {
    discordVerificationToken = '';
    discordVerifiedIdentity = null;

    if (discordContactInput) discordContactInput.value = '';
    if (discordGlobalNameInput) discordGlobalNameInput.value = '';
    if (discordUserIdInput) discordUserIdInput.value = '';

    discordVerification?.classList.remove('verified');

    try {
      sessionStorage.removeItem(DISCORD_VERIFIED_KEY);
    } catch {}

    if (reason) setDiscordStatus('error', reason);
    else setDiscordStatus('', 'Not verified yet.');

    if (discordVerifyBtn) {
      discordVerifyBtn.textContent = 'Verify Discord & join Applicant Lounge';
    }
  }

  function applyDiscordIdentity(data) {
    const username = String(data.username || '').trim();
    const globalName = String(data.global_name || '').trim();
    const userId = String(data.user_id || '').trim();

    if (discordContactInput) {
      discordContactInput.value = username ? `@${username}` : '';
    }
    if (discordGlobalNameInput) {
      discordGlobalNameInput.value = globalName || username;
    }
    if (discordUserIdInput) {
      discordUserIdInput.value = userId;
    }

    discordVerifiedIdentity = {
      user_id: userId,
      username,
      global_name: globalName
    };

    discordVerification?.classList.add('verified');

    if (discordVerifyBtn) {
      discordVerifyBtn.textContent = 'Verify a different Discord account';
    }

    setDiscordStatus(
      'success',
      `✓ Discord verified: ${globalName || username}${globalName && username ? ` (@${username})` : ''}. Applicant access is active.`
    );
  }

  async function restoreDiscordVerification() {
    let token = '';
    try {
      token = sessionStorage.getItem(DISCORD_VERIFIED_KEY) || '';
    } catch {}

    if (!token || !client) return;

    const { data, error } = await client.functions.invoke('discord-recruitment', {
      body: { action: 'status', token }
    });

    if (error || !data?.ok || !data?.verified) {
      try { sessionStorage.removeItem(DISCORD_VERIFIED_KEY); } catch {}
      return;
    }

    discordVerificationToken = token;
    applyDiscordIdentity(data);
  }

  async function beginDiscordVerification() {
    if (!client) return;

    saveRecruitmentDraft();
    setDiscordStatus('info', 'Opening Discord secure sign-in…');
    discordVerifyBtn.disabled = true;

    const { data, error } = await client.functions.invoke('discord-recruitment', {
      body: { action: 'start' }
    });

    discordVerifyBtn.disabled = false;

    if (error || !data?.ok || !data?.authorizeUrl) {
      console.error(error || data);
      setDiscordStatus(
        'error',
        data?.message || 'Discord verification could not start. Please try again.'
      );
      return;
    }

    window.location.assign(data.authorizeUrl);
  }

  async function handleDiscordReturn() {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('discord');
    const token = params.get('discord_token');
    const reason = params.get('discord_reason');

    if (!result && !token && !reason) {
      await restoreDiscordVerification();
      return;
    }

    const cleanUrl = `${window.location.pathname}${window.location.hash || '#apply'}`;
    history.replaceState(null, '', cleanUrl);

    if (result === 'verified' && token) {
      const { data, error } = await client.functions.invoke('discord-recruitment', {
        body: { action: 'status', token }
      });

      if (error || !data?.ok || !data?.verified) {
        console.error(error || data);
        clearDiscordVerification(
          'Discord verification could not be confirmed. Please verify again.'
        );
        return;
      }

      discordVerificationToken = token;
      try {
        sessionStorage.setItem(DISCORD_VERIFIED_KEY, token);
      } catch {}

      applyDiscordIdentity(data);
      return;
    }

    if (result === 'cancelled') {
      setDiscordStatus('error', 'Discord verification was cancelled.');
      return;
    }

    setDiscordStatus(
      'error',
      reason || 'Discord verification could not be completed. Please try again.'
    );
  }


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

  // Battle.net redirects back to this same recruitment page.
  // Restore the applicant's draft, validate the signed verification token,
  // then continue the form exactly where they left off.
  handleBattleNetReturn();
  handleDiscordReturn();

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

    if (!battleNetVerificationToken || !battleNetVerifiedIdentity || !verificationMatchesCurrentCharacter(battleNetVerifiedIdentity)) {
      show(
        msg,
        'Your application has not been submitted. Verify this character with Battle.net first.',
        'error'
      );
      setBattleNetStatus(
        'error',
        'Battle.net ownership verification is required before this application can be submitted.'
      );
      document.getElementById('battleNetVerification')?.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }

    if (!discordVerificationToken || !discordVerifiedIdentity?.user_id) {
      show(
        msg,
        'Your application has not been submitted. Verify your Discord account first.',
        'error'
      );
      setDiscordStatus(
        'error',
        'Discord verification is required so ODit can contact the correct account.'
      );
      document.getElementById('discordVerification')?.scrollIntoView({behavior:'smooth', block:'center'});
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
      privacy_consent: fd.has('privacy_consent'),
      bnet_verification_token: battleNetVerificationToken,
      discord_verification_token: discordVerificationToken
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
    sessionStorage.removeItem(BNET_DRAFT_KEY);
    sessionStorage.removeItem(BNET_VERIFIED_KEY);
    sessionStorage.removeItem(DISCORD_VERIFIED_KEY);
    clearBattleNetVerification('', { clearCharacter: true });
    clearDiscordVerification();
    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId);
    }
    turnstileToken = '';
    populateRealmOptions();
    clearAutoFilledCharacter();
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
