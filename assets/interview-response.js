(() => {
  const cfg = window.ODIT_SUPABASE || {};
  const title = document.getElementById('responseTitle');
  const intro = document.getElementById('responseIntro');
  const status = document.getElementById('responseStatus');
  const confirmView = document.getElementById('confirmView');
  const rescheduleView = document.getElementById('rescheduleView');
  const confirmDetails = document.getElementById('confirmDetails');
  const rescheduleDetails = document.getElementById('rescheduleDetails');
  const availability = document.getElementById('availability');
  const confirmBtn = document.getElementById('confirmBtn');
  const rescheduleBtn = document.getElementById('rescheduleBtn');

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const initialChoice = params.get('choice') || 'confirm';
  history.replaceState(null, '', window.location.pathname);

  if (!window.supabase || !cfg.url || !cfg.key || !token) {
    title.textContent = 'That link could not be opened';
    intro.textContent = 'Please use the newest recruitment message from Oh Duck It.';
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.key);
  let info = null;

  function showStatus(text, kind='') {
    status.textContent = text;
    status.className = `response-status ${kind}`.trim();
    status.classList.remove('hidden');
  }

  function hideStatus() { status.classList.add('hidden'); }
  function niceTime(value) {
    return new Date(value).toLocaleString([], {dateStyle:'full', timeStyle:'short'});
  }

  async function invoke(action, extra={}) {
    const { data, error } = await client.functions.invoke('discord-recruitment', {
      body: { action, token, ...extra }
    });
    if (!error && data?.ok) return data;

    let message = data?.message || '';
    if (!message) {
      try {
        const context = error?.context;
        if (context && typeof context.clone === 'function') {
          const payload = await context.clone().json();
          message = payload?.message || '';
        }
      } catch {}
    }
    throw new Error(message || 'We could not record that response. Please try again.');
  }

  function showConfirm() {
    hideStatus();
    rescheduleView.classList.add('hidden');
    confirmView.classList.remove('hidden');
    title.textContent = 'Does that time work for you?';
    intro.textContent = 'This is just a quick chat with the ODit recruitment team — nothing formal.';
    confirmDetails.textContent = `${niceTime(info.interview_at)} • ${info.interview_room || 'Applicant voice room'}`;
  }

  function showReschedule() {
    hideStatus();
    confirmView.classList.add('hidden');
    rescheduleView.classList.remove('hidden');
    title.textContent = "No problem — let's find a better time";
    intro.textContent = 'Give us a rough idea of when you are free and the assigned officer will come back to you.';
    rescheduleDetails.textContent = `The current suggestion is ${niceTime(info.interview_at)} in ${info.interview_room || 'the Applicant voice room'}.`;
  }

  async function confirm() {
    confirmBtn.disabled = true;
    try {
      const data = await invoke('interview_response', { response: 'confirm' });
      confirmView.classList.add('hidden');
      rescheduleView.classList.add('hidden');
      title.textContent = 'Nice one — see you then!';
      intro.textContent = 'The recruitment team has been told that the time works for you.';
      showStatus(data.message || "You're all set.", 'success');
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  }

  async function reschedule() {
    const message = availability.value.trim();
    if (!message) {
      showStatus('Tell us roughly what days or times suit you better.', 'error');
      availability.focus();
      return;
    }

    rescheduleBtn.disabled = true;
    try {
      const data = await invoke('interview_response', { response: 'reschedule', message });
      confirmView.classList.add('hidden');
      rescheduleView.classList.add('hidden');
      title.textContent = "Thanks — we'll sort another time";
      intro.textContent = 'The recruitment team has your availability and will message you again once another time is agreed.';
      showStatus(data.message || 'Your message has been sent.', 'success');
    } catch (err) {
      showStatus(err.message, 'error');
    } finally {
      rescheduleBtn.disabled = false;
    }
  }

  confirmBtn.addEventListener('click', confirm);
  rescheduleBtn.addEventListener('click', reschedule);
  document.getElementById('switchToReschedule').addEventListener('click', showReschedule);
  document.getElementById('backToConfirm').addEventListener('click', showConfirm);

  (async () => {
    try {
      info = await invoke('interview_response_info');
      if (info.response_status === 'Confirmed') {
        title.textContent = 'Nice one — you are already confirmed';
        intro.textContent = 'The recruitment team already knows the time works for you.';
        showStatus("You're all set.", 'success');
        return;
      }
      if (info.response_status === 'Reschedule requested') {
        title.textContent = "We've got your request for another time";
        intro.textContent = 'The recruitment team will come back to you with another suggestion.';
        showStatus('No need to send it again.', 'success');
        return;
      }
      if (initialChoice === 'reschedule') showReschedule();
      else showConfirm();
    } catch (err) {
      title.textContent = 'That chat link is no longer current';
      intro.textContent = 'Please use the newest recruitment message from Oh Duck It.';
      showStatus(err.message, 'error');
    }
  })();
})();
