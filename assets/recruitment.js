(() => {
  const form = document.getElementById('recruitmentForm');
  if (!form) return;
  const msg = document.getElementById('formMessage');
  const backendNotice = document.getElementById('backendNotice');
  const submitBtn = document.getElementById('submitBtn');
  const cfg = window.ODIT_SUPABASE || {};
  const configured = cfg.url && cfg.key && !cfg.url.startsWith('YOUR_') && !cfg.key.startsWith('YOUR_');
  let client = null;

  const show = (el, text, kind='info') => {
    el.hidden = false;
    el.className = `notice ${kind}`;
    el.textContent = text;
  };

  if (!configured) {
    show(backendNotice, 'Recruitment backend not connected yet. Add the Supabase URL and publishable/anon key in assets/supabase-config.js after running the included database setup.', 'info');
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.hidden = true;
    if (!configured || !client) return;
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
      show(msg, 'We could not submit the application. Please check the form or contact an ODit officer on Discord.', 'error');
      return;
    }
    form.reset();
    show(msg, 'Application submitted. An ODit officer can now review it in the Officer Portal.', 'success');
    msg.scrollIntoView({behavior:'smooth', block:'center'});
  });
})();
