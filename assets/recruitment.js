(() => {
  const form = document.getElementById('recruitmentForm');
  if (!form) return;

  const msg = document.getElementById('formMessage');
  const backendNotice = document.getElementById('backendNotice');
  const submitBtn = document.getElementById('submitBtn');
  const classSelect = document.getElementById('class_name');
  const mainSpecSelect = document.getElementById('main_spec');
  const offSpecSelect = document.getElementById('off_specs');
  const profession1 = document.getElementById('profession_1');
  const profession2 = document.getElementById('profession_2');
  const interestBoxes = [...form.querySelectorAll('input[name^="interest_"]')];

  const cfg = window.ODIT_SUPABASE || {};
  const configured =
    cfg.url &&
    cfg.key &&
    !cfg.url.startsWith('YOUR_') &&
    !cfg.key.startsWith('YOUR_');

  let client = null;

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

  const option = (value, label=value) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    return opt;
  };

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

  classSelect.addEventListener('change', () => {
    resetSpecSelects();
    updateOffSpecOptions();
  });

  mainSpecSelect.addEventListener('change', updateOffSpecOptions);
  profession1.addEventListener('change', updateProfessionOptions);
  profession2.addEventListener('change', updateProfessionOptions);
  interestBoxes.forEach(box => box.addEventListener('change', validateInterests));

  resetSpecSelects();
  updateProfessionOptions();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.hidden = true;

    if (!configured || !client) return;

    validateInterests();
    if (!form.reportValidity()) return;

    const fd = new FormData(form);
    if (value(fd, 'website')) return; // honeypot

    const payload = {
      character_name: value(fd, 'character_name'),
      realm: value(fd, 'realm'),
      region: value(fd, 'region'),
      class_name: value(fd, 'class_name'),
      main_spec: value(fd, 'main_spec'),
      role: value(fd, 'role'),
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

    const { error } = await client.from('applications').insert(payload);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Application';

    if (error) {
      console.error(error);

      const missingColumns =
        /profession_1|profession_2|interests/i.test(error.message || '');

      show(
        msg,
        missingColumns
          ? 'The application form has been updated, but the recruitment database still needs the V22 migration. Please contact an ODit officer.'
          : 'We could not submit the application. Please check the form or contact an ODit officer on Discord.',
        'error'
      );
      return;
    }

    form.reset();
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
