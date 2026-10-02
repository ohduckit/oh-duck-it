(() => {

  // Split the former single DPS Lead into separate Melee and Ranged DPS Leads.
  // This runs before the page-specific scripts so Guild Management and the
  // public Guild Structure page both work with the new assignment keys.
  function splitDpsLeadUi() {
    // Guild Management: replace the old single field with two editable fields.
    const legacyInput = document.querySelector(
      'input[data-structure-owner="dps-lead"]'
    );

    if (legacyInput) {
      const field = legacyInput.closest('.field');
      if (field) {
        const melee = document.createElement('div');
        melee.className = 'field';
        melee.innerHTML =
          '<label>Melee DPS Lead</label>' +
          '<input data-structure-owner="melee-dps-lead">';

        const ranged = document.createElement('div');
        ranged.className = 'field';
        ranged.innerHTML =
          '<label>Ranged DPS Lead</label>' +
          '<input data-structure-owner="ranged-dps-lead">';

        field.replaceWith(melee, ranged);
      }
    }

    // Public Guild Structure: replace the old DPS role card with two cards.
    const legacyOwner = document.querySelector('[data-owner="dps-lead"]');
    const legacyCard = legacyOwner?.closest('.role');

    if (legacyCard) {
      const previousOwner =
        (legacyOwner.textContent || '').trim() || 'To be appointed';

      const meleeCard = document.createElement('article');
      meleeCard.className = 'role';
      meleeCard.innerHTML = `
        <div class="role-head">
          <div>
            <div class="role-name">Melee DPS Lead</div>
            <div class="owner" data-owner="melee-dps-lead">${previousOwner}</div>
          </div>
          <span>⚔</span>
        </div>
        <div class="summary">Melee DPS community, execution and development.</div>
        <div class="details">
          <ul>
            <li>Supports melee DPS recruitment, readiness and improvement.</li>
            <li>Helps with uptime, positioning, utility and class resources.</li>
          </ul>
        </div>`;

      const rangedCard = document.createElement('article');
      rangedCard.className = 'role';
      rangedCard.innerHTML = `
        <div class="role-head">
          <div>
            <div class="role-name">Ranged DPS Lead</div>
            <div class="owner" data-owner="ranged-dps-lead">To be appointed</div>
          </div>
          <span>🏹</span>
        </div>
        <div class="summary">Ranged DPS community, execution and development.</div>
        <div class="details">
          <ul>
            <li>Supports ranged DPS recruitment, readiness and improvement.</li>
            <li>Helps with priority damage, positioning, utility and class resources.</li>
          </ul>
        </div>`;

      legacyCard.replaceWith(meleeCard, rangedCard);
    }
  }

  splitDpsLeadUi();

  // Backward-compatible migration helper:
  // Until the new fields are saved, carry the existing DPS Lead into Melee DPS
  // Lead and leave Ranged DPS Lead as "To be appointed". Once the officer saves
  // Guild Structure, the normal management script stores the two new keys.
  async function hydrateSplitDpsLeads() {
    const cfg = window.ODIT_SUPABASE || {};
    if (!cfg.url || !cfg.key || !window.supabase?.createClient) return;

    try {
      const client = window.supabase.createClient(cfg.url, cfg.key);
      const { data, error } = await client
        .from('guild_structure')
        .select('assignments')
        .eq('id', 1)
        .maybeSingle();

      if (error || !data) return;

      const assignments = data.assignments || {};
      const legacy =
        typeof assignments['dps-lead'] === 'string' &&
        assignments['dps-lead'].trim()
          ? assignments['dps-lead'].trim()
          : 'To be appointed';

      const melee =
        typeof assignments['melee-dps-lead'] === 'string' &&
        assignments['melee-dps-lead'].trim()
          ? assignments['melee-dps-lead'].trim()
          : legacy;

      const ranged =
        typeof assignments['ranged-dps-lead'] === 'string' &&
        assignments['ranged-dps-lead'].trim()
          ? assignments['ranged-dps-lead'].trim()
          : 'To be appointed';

      document.querySelectorAll(
        'input[data-structure-owner="melee-dps-lead"]'
      ).forEach(input => {
        if (!input.value.trim() || !assignments['melee-dps-lead']) {
          input.value = melee;
        }
      });

      document.querySelectorAll(
        'input[data-structure-owner="ranged-dps-lead"]'
      ).forEach(input => {
        if (!input.value.trim() || !assignments['ranged-dps-lead']) {
          input.value = ranged;
        }
      });

      document.querySelectorAll('[data-owner="melee-dps-lead"]')
        .forEach(el => { el.textContent = melee; });

      document.querySelectorAll('[data-owner="ranged-dps-lead"]')
        .forEach(el => { el.textContent = ranged; });
    } catch (error) {
      console.warn('ODit DPS lead split could not hydrate:', error);
    }
  }

  window.addEventListener('load', () => {
    // Run twice so this stays reliable if the page-specific Supabase load
    // completes shortly after the first pass.
    window.setTimeout(hydrateSplitDpsLeads, 250);
    window.setTimeout(hydrateSplitDpsLeads, 1200);
  });

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
