/**
 * Praktisch KAD – app.js
 * Responsibilities:
 *   1. Fetch ./data.json with strict error handling
 *   2. Inject all dynamic content into the DOM
 *   3. Build Bento Grid cards from data
 *   4. IntersectionObserver: staggered reveal-on-scroll
 *   5. Mobile nav toggle
 *   6. Sticky header scroll class
 *
 * Hard rules:
 *   - No framework, no dependencies
 *   - Missing JSON fields never crash the page; affected elements are hidden
 *   - All user-supplied strings are escaped before innerHTML insertion
 */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── DOM helpers ──────────────────────────────────────────────────────────── */
  const $       = id  => document.getElementById(id);
  const setText = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  const setAttr = (id, attr, val) => { const el = $(id); if (el) el.setAttribute(attr, val); };
  const hide    = id  => { const el = $(id); if (el) el.hidden = true; };

  /* ── XSS guard ────────────────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#039;');
  }

  /* ── 1. IntersectionObserver: Reveal on scroll ────────────────────────────── */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);  // fire once only
        }
      });
    }, {
      threshold:  0.1,
      rootMargin: '0px 0px -36px 0px'
    });

    els.forEach(el => observer.observe(el));
  }

  /* ── 2. Sticky header class ───────────────────────────────────────────────── */
  function initStickyHeader() {
    const header = $('site-header');
    if (!header) return;

    // Sentinel div at the very top of the document
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;pointer-events:none;';
    document.body.prepend(sentinel);

    new IntersectionObserver(
      ([entry]) => header.classList.toggle('scrolled', !entry.isIntersecting),
      { threshold: 0 }
    ).observe(sentinel);
  }

  /* ── 3. Mobile nav toggle ─────────────────────────────────────────────────── */
  function initMobileNav() {
    const toggle = $('nav-toggle');
    const nav    = $('main-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Navigation schließen' : 'Navigation öffnen');
    });

    // Close nav on any link click (anchor navigation or external)
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Navigation öffnen');
      });
    });

    // Close nav on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Navigation öffnen');
        toggle.focus();
      }
    });
  }

  /* ── 4. Build Bento Grid from leistungen array ────────────────────────────── */
  function renderBentoGrid(leistungen) {
    const grid = $('bento-grid');
    if (!grid) return;

    if (!Array.isArray(leistungen) || leistungen.length === 0) {
      hide('leistungen');
      return;
    }

    const fragment = document.createDocumentFragment();

    leistungen.forEach((item, i) => {
      if (!item || !item.titel) return;

      const article = document.createElement('article');
      article.className = 'bento-item reveal';
      // Stagger delay: items 0→1, 1→2, 2→3
      article.setAttribute('data-delay', String(i + 1));
      article.setAttribute('role', 'listitem');

      article.innerHTML = `
        ${item.tag ? `<span class="bento-tag">${escHtml(item.tag)}</span>` : ''}
        ${item.icon ? `<span class="bento-icon" aria-hidden="true">${escHtml(item.icon)}</span>` : ''}
        <h3>${escHtml(item.titel)}</h3>
        ${item.desc ? `<p>${escHtml(item.desc)}</p>` : ''}
        <span class="bento-arrow" aria-hidden="true">Mehr erfahren →</span>
      `;

      fragment.appendChild(article);
    });

    grid.appendChild(fragment);
  }

  /* ── 5. Build About list ──────────────────────────────────────────────────── */
  function renderAboutList(punkte) {
    const list = $('about-list');
    if (!list) return;

    if (!Array.isArray(punkte) || punkte.length === 0) {
      hide('about');
      return;
    }

    const fragment = document.createDocumentFragment();

    punkte.forEach((text, i) => {
      if (!text) return;
      const li = document.createElement('li');
      li.className = 'reveal';
      li.setAttribute('data-delay', String((i % 2) + 1));
      li.textContent = text;
      fragment.appendChild(li);
    });

    list.appendChild(fragment);
  }

  /* ── 6. Populate all static shell elements ────────────────────────────────── */
  function populateShell(data) {
    const c    = data.config || {};
    const hero = data.hero   || {};
    const year = new Date().getFullYear();

    // ── Meta & title ──────────────────────────────────────────────────────
    const firm = c.firmenname || '';

    if (firm) {
      setText('header-firmenname', firm);
      document.title = firm;
      setText('footer-copy', `© ${year} ${firm}`);
    } else {
      hide('site-header');
      hide('site-footer');
    }

    // ── Contact links ─────────────────────────────────────────────────────
    const telLink = c.telefon_link || null;
    const telNum  = c.telefon      || '';
    const waLink  = c.whatsapp_nummer
      ? `https://wa.me/${c.whatsapp_nummer}`
      : null;

    if (telLink) {
      setAttr('hero-cta-tel',    'href', telLink);
      setAttr('kontakt-tel-card','href', telLink);
      setAttr('sticky-tel',      'href', telLink);
      setAttr('nav-cta',         'href', telLink);
      setText('kontakt-tel-num', telNum);
    } else {
      hide('kontakt-tel-card');
      hide('sticky-tel');
    }

    if (waLink) {
      setAttr('kontakt-wa-card', 'href', waLink);
      setAttr('sticky-wa',       'href', waLink);
    } else {
      hide('kontakt-wa-card');
      hide('sticky-wa');
      // If both contact cards hidden, hide entire section
      if (!telLink) hide('kontakt');
    }

    // ── Hero text ─────────────────────────────────────────────────────────
    const heroTitel   = hero.titel   || '';
    const heroSubline = hero.subline || '';

    if (heroTitel || heroSubline) {
      setText('hero-titel',   heroTitel);
      setText('hero-subline', heroSubline);
    } else {
      hide('hero');
    }

    // ── About / Statement ─────────────────────────────────────────────────
    const about = data.about || {};
    if (about.statement) {
      setText('about-statement', about.statement);
    }
    renderAboutList(about.punkte);

    // ── Leistungen Bento Grid ─────────────────────────────────────────────
    renderBentoGrid(data.leistungen);
  }

  /* ── BOOTSTRAP ────────────────────────────────────────────────────────────── */
  try {
    const response = await fetch('./data.json');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} – data.json nicht geladen`);
    }

    const data = await response.json();

    populateShell(data);

    // UI interactions are independent of data; always init
    initMobileNav();
    initStickyHeader();

    // Reveal observer must run AFTER DOM is fully populated
    initReveal();

  } catch (err) {
    console.error('[app.js] Kritischer Ladefehler:', err.message);

    // Graceful degradation: show error notice, hide broken dynamic sections
    ['hero', 'about', 'leistungen'].forEach(hide);

    const errorEl = document.createElement('div');
    errorEl.style.cssText = [
      'padding: 2rem 1.5rem',
      'max-width: 640px',
      'margin: 3rem auto',
      'font-family: monospace',
      'font-size: 0.85rem',
      'color: #ff4d4d',
      'border: 1px solid rgba(255,77,77,0.2)',
      'border-radius: 8px',
      'background: rgba(255,77,77,0.05)',
    ].join(';');
    errorEl.innerHTML = `
      <strong>Seiteninhalt nicht ladbar</strong><br><br>
      <code>${escHtml(err.message)}</code><br><br>
      Stellen Sie sicher, dass <code>data.json</code> im gleichen Verzeichnis liegt
      und der Server CORS-Header für lokale Anfragen zulässt.
    `;

    const main = document.querySelector('section#kontakt') || document.body;
    main.before(errorEl);

    // Still init UI for any static content that survived
    initMobileNav();
    initStickyHeader();
    initReveal();
  }

});
