(() => {
  const btn = document.querySelector('.menu-toggle');
  const links = document.querySelector('.site-links');
  if (btn && links) {
    btn.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }
})();
