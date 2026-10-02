(() => {
  const navs = [...document.querySelectorAll('.side-nav')];
  if (!navs.length) return;

  navs.forEach((nav) => {
    const links = [...nav.querySelectorAll('a[href^="#"]')]
      .filter(link => {
        const href = link.getAttribute('href');
        return href && href.length > 1 && document.getElementById(decodeURIComponent(href.slice(1)));
      });

    if (!links.length) return;

    const entries = links.map(link => {
      const id = decodeURIComponent(link.getAttribute('href').slice(1));
      return { id, link, section: document.getElementById(id) };
    });

    let activeId = null;
    let clickLockUntil = 0;

    const setActive = (id) => {
      if (!id || id === activeId) return;
      activeId = id;

      entries.forEach(entry => {
        const active = entry.id === id;
        entry.link.classList.toggle('active', active);

        if (active) {
          entry.link.setAttribute('aria-current', 'location');
          // Keep the active item visible when the nav becomes horizontally
          // scrollable on smaller screens.
          entry.link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        } else {
          entry.link.removeAttribute('aria-current');
        }
      });
    };

    const getHeaderOffset = () => {
      const topBar = document.querySelector('.sitebar');
      return Math.max(76, (topBar?.getBoundingClientRect().height || 66) + 18);
    };

    const mostVisibleSection = () => {
      const topLimit = getHeaderOffset();
      const bottomLimit = window.innerHeight;
      let best = null;

      entries.forEach((entry, index) => {
        const rect = entry.section.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, topLimit);
        const visibleBottom = Math.min(rect.bottom, bottomLimit);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);

        // Prefer the section occupying the largest amount of usable viewport.
        // Slightly bias a section whose heading has already crossed the top line.
        let score = visibleHeight;
        if (rect.top <= topLimit + 24 && rect.bottom > topLimit) score += 80;

        // At exact ties, prefer the later section as the user scrolls downward.
        if (!best || score > best.score || (score === best.score && index > best.index)) {
          best = { entry, score, index };
        }
      });

      return best && best.score > 0 ? best.entry : entries[0];
    };

    const updateFromViewport = () => {
      // Do not let scroll events immediately undo a user's click while the
      // browser is performing the smooth anchor movement.
      if (performance.now() < clickLockUntil) return;
      const current = mostVisibleSection();
      if (current) setActive(current.id);
    };

    let ticking = false;
    const requestViewportUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateFromViewport();
      });
    };

    entries.forEach(entry => {
      entry.link.addEventListener('click', event => {
        event.preventDefault();

        setActive(entry.id);
        clickLockUntil = performance.now() + 650;

        const top = window.scrollY + entry.section.getBoundingClientRect().top - getHeaderOffset() - 10;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

        if (history.pushState) {
          history.pushState(null, '', `#${encodeURIComponent(entry.id)}`);
        }

        // Re-evaluate once the smooth scroll has settled.
        window.setTimeout(() => {
          clickLockUntil = 0;
          updateFromViewport();
        }, 700);
      });
    });

    // Direct links such as structure.html#roles must highlight the requested
    // section immediately, even before the browser finishes anchor positioning.
    const initialId = decodeURIComponent(location.hash.replace(/^#/, ''));
    const initialEntry = entries.find(entry => entry.id === initialId);
    setActive(initialEntry ? initialEntry.id : entries[0].id);

    window.addEventListener('scroll', requestViewportUpdate, { passive: true });
    window.addEventListener('resize', requestViewportUpdate);

    window.addEventListener('popstate', () => {
      const id = decodeURIComponent(location.hash.replace(/^#/, ''));
      const entry = entries.find(item => item.id === id);
      if (entry) {
        setActive(entry.id);
        const top = window.scrollY + entry.section.getBoundingClientRect().top - getHeaderOffset() - 10;
        window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
      } else {
        updateFromViewport();
      }
    });

    // Browser anchor positioning can happen after script execution. A few
    // delayed checks make the initial state deterministic.
    requestAnimationFrame(updateFromViewport);
    window.setTimeout(updateFromViewport, 120);
    window.setTimeout(updateFromViewport, 350);
  });
})();
