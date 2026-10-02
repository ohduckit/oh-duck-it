(() => {
  const sideNavs = [...document.querySelectorAll('.side-nav')];
  if (!sideNavs.length) return;

  sideNavs.forEach((nav) => {
    const links = [...nav.querySelectorAll('a[href^="#"]')]
      .filter(a => a.getAttribute('href') && a.getAttribute('href') !== '#');

    const items = links
      .map(link => {
        const id = decodeURIComponent(link.getAttribute('href').slice(1));
        const section = document.getElementById(id);
        return section ? { link, id, section } : null;
      })
      .filter(Boolean);

    if (!items.length) return;

    const setActive = (id, updateHash = false) => {
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));

      if (updateHash && history.replaceState) {
        const url = `${location.pathname}${location.search}#${encodeURIComponent(id)}`;
        history.replaceState(null, '', url);
      }
    };

    // Clicking a nav item updates the highlight immediately.
    items.forEach(({ link, id }) => {
      link.addEventListener('click', () => setActive(id, false));
    });

    // Honour a section hash when arriving directly on the page.
    const initialHash = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (initialHash && items.some(x => x.id === initialHash)) {
      setActive(initialHash, false);
    } else {
      setActive(items[0].id, false);
    }

    // Scroll-spy: highlight whichever section occupies the reading position.
    let ticking = false;

    const updateFromScroll = () => {
      ticking = false;

      // Reading line sits below the sticky top nav / page chrome.
      const readingLine = 155;
      let current = items[0];

      for (const item of items) {
        const rect = item.section.getBoundingClientRect();

        // Once a section's top passes the reading line, it becomes current.
        if (rect.top <= readingLine) current = item;

        // Stop once we reach a section whose top is still below the reading line.
        if (rect.top > readingLine) break;
      }

      // At the very bottom of the page, force the last section active.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;

      if (atBottom) current = items[items.length - 1];

      setActive(current.id, true);
    };

    const requestUpdate = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateFromScroll);
      }
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('hashchange', () => {
      const id = decodeURIComponent(location.hash.replace(/^#/, ''));
      if (items.some(x => x.id === id)) setActive(id, false);
    });

    // One pass after layout settles.
    requestAnimationFrame(() => requestAnimationFrame(updateFromScroll));
  });
})();
