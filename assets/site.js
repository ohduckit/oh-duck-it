(() => {
  // Officer access is intentionally not advertised to public visitors.
  // site-auth.js adds the private links back only after Supabase confirms
  // the current signed-in account is an active ODit officer.
  document.querySelectorAll('.site-links .officer-link, .site-links .management-link')
    .forEach(link => link.remove());

  // Mobile top navigation.
  const menuButton = document.querySelector('.menu-toggle');
  const topLinks = document.querySelector('.site-links');

  if (menuButton && topLinks) {
    menuButton.addEventListener('click', () => {
      const open = topLinks.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });

    topLinks.addEventListener('click', () => {
      topLinks.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  }

  // Shared in-page side navigation.
  document.querySelectorAll('.side-nav').forEach(nav => {
    const items = [...nav.querySelectorAll('a[href^="#"]')]
      .map(link => {
        const hash = link.getAttribute('href');
        if (!hash || hash === '#') return null;

        const id = decodeURIComponent(hash.slice(1));
        const section = document.getElementById(id);
        return section ? { link, id, section } : null;
      })
      .filter(Boolean);

    if (!items.length) return;

    items.forEach(({ link }) => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });

    let activeId = '';

    const setActive = id => {
      if (!id || activeId === id) return;
      activeId = id;

      items.forEach(({ link, id: itemId }) => {
        const active = itemId === id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };

    const headerBottom = () => {
      const bar = document.querySelector('.sitebar');
      return (bar?.getBoundingClientRect().bottom || 66);
    };

    const sectionAtReadingLine = () => {
      const top = headerBottom();
      const available = Math.max(200, window.innerHeight - top);
      const readingLine = top + Math.min(220, available * 0.34);

      let containing = null;
      let nearest = items[0];
      let nearestDistance = Infinity;

      for (const item of items) {
        const rect = item.section.getBoundingClientRect();

        if (rect.top <= readingLine && rect.bottom > readingLine) {
          containing = item;
          break;
        }

        const distance = Math.abs(rect.top - readingLine);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = item;
        }
      }

      return containing || nearest;
    };

    let clickLockUntil = 0;
    let framePending = false;

    const syncFromScroll = () => {
      framePending = false;
      if (performance.now() < clickLockUntil) return;

      const current = sectionAtReadingLine();
      if (current) setActive(current.id);
    };

    const requestSync = () => {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(syncFromScroll);
    };

    items.forEach(item => {
      item.link.addEventListener('click', event => {
        event.preventDefault();

        setActive(item.id);
        clickLockUntil = performance.now() + 500;

        const offset = headerBottom() + 18;
        const targetY =
          window.scrollY +
          item.section.getBoundingClientRect().top -
          offset;

        history.replaceState(null, '', `#${encodeURIComponent(item.id)}`);
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });

        window.setTimeout(() => {
          clickLockUntil = 0;
          syncFromScroll();
        }, 560);
      });
    });

    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync);

    const hashId = decodeURIComponent(location.hash.replace(/^#/, ''));
    const hashItem = items.find(item => item.id === hashId);

    if (hashItem) {
      setActive(hashItem.id);
    } else {
      const initial = sectionAtReadingLine();
      if (initial) setActive(initial.id);
    }

    requestAnimationFrame(requestSync);
    setTimeout(requestSync, 100);
    setTimeout(requestSync, 300);
  });

  // Load the officer-aware navigation on every standard ODit page.
  if (!document.querySelector('script[data-odit-site-auth]')) {
    const authScript = document.createElement('script');
    authScript.src = 'assets/site-auth.js';
    authScript.dataset.oditSiteAuth = 'true';
    authScript.defer = true;
    document.head.appendChild(authScript);
  }
})();
