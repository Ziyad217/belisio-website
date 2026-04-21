/* ============================================================
   belisio — Webdesign-Agentur
   script.js
   ============================================================ */



(function () {
  'use strict';

  /* ─── 1. SCROLL REVEAL ─────────────────────────────────── */
  document.querySelectorAll('.reveal[data-delay]').forEach(el => {
    el.style.transitionDelay = el.dataset.delay;
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


  /* ─── 2. COMPACT HEADER ────────────────────────────────── */
  const header = document.querySelector('.site-header');
  const hero   = document.querySelector('.hero');
  if (header && hero) {
    new IntersectionObserver(
      ([entry]) => header.classList.toggle('is-compact', !entry.isIntersecting),
      { threshold: 0.05 }
    ).observe(hero);
  }


  /* ─── 3. MOBILE NAV ────────────────────────────────────── */
  const toggle  = document.querySelector('.nav__toggle');
  const navMenu = document.querySelector('#nav-menu');

  if (toggle && navMenu) {
    navMenu.setAttribute('aria-hidden', 'true');

    const openNav = () => {
      toggle.setAttribute('aria-expanded', 'true');
      navMenu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('nav-open');
      navMenu.querySelector('.nav__link')?.focus();
    };

    const closeNav = () => {
      toggle.setAttribute('aria-expanded', 'false');
      navMenu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('nav-open');
    };

    toggle.addEventListener('click', () => {
      toggle.getAttribute('aria-expanded') === 'true' ? (closeNav(), toggle.focus()) : openNav();
    });

    navMenu.querySelectorAll('.nav__link').forEach(l => l.addEventListener('click', closeNav));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        closeNav();
        toggle.focus();
      }
    });

    document.addEventListener('click', e => {
      if (document.body.classList.contains('nav-open') &&
          !navMenu.contains(e.target) && !toggle.contains(e.target)) closeNav();
    });
  }


  /* ─── 4. CUSTOM CURSOR ─────────────────────────────────── */
  const cursor = document.querySelector('.cursor');
  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    document.body.classList.add('has-cursor');
    const style = document.createElement('style');
    style.textContent = '.has-cursor, .has-cursor * { cursor: none !important; }';
    document.head.appendChild(style);

    let rafId;
    document.addEventListener('mousemove', e => {
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          cursor.style.setProperty('--cursor-x', e.clientX + 'px');
          cursor.style.setProperty('--cursor-y', e.clientY + 'px');
          rafId = null;
        });
      }
    });

    document.querySelectorAll('a, button, .cal-day--available, .slot-btn:not(.slot-btn--booked), input, textarea')
      .forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
      });

    document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });
  }


  /* ─── 5. SMOOTH SCROLL ─────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const orig = target.getAttribute('tabindex');
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.addEventListener('blur', () => {
        orig === null ? target.removeAttribute('tabindex') : target.setAttribute('tabindex', orig);
      }, { once: true });
    });
  });


  /* ─── 6. BOOKING WIDGET ────────────────────────────────── */

  /**
   * Google Apps Script URL — nach dem Deployen hier eintragen.
   * Anleitung: booking-backend.gs im Projekt-Ordner lesen.
   * Beispiel: 'https://script.google.com/macros/s/AKfycb.../exec'
   */
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx5ovCZ6qgjwza8xTdx8-qe2MbOth-tys_sa7VTfHa6wqY3sxvo_WKJCmPY_XqgyDEXtA/exec';

  const MONTHS_DE = [
    'Januar','Februar','März','April','Mai','Juni',
    'Juli','August','September','Oktober','November','Dezember'
  ];
  // Available time slots
  const TIME_SLOTS = ['09:00','10:00','11:00','14:00','15:00','16:00','17:00'];

  const slotsCache = {};

  async function fetchSlots(dateStr) {
    if (slotsCache[dateStr]) return slotsCache[dateStr];
    try {
      const res  = await fetch(`${APPS_SCRIPT_URL}?date=${dateStr}`);
      const data = await res.json();
      slotsCache[dateStr] = data;
      return data;
    } catch {
      return { free: TIME_SLOTS, booked: [] };
    }
  }

  function isDayAvailable(date) {
    const today = new Date();
    today.setHours(0,0,0,0);
    if (date < today) return false;
    const dow = date.getDay();
    return dow !== 0 && dow !== 6;
  }

  function toDateStr(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function formatDateDE(date) {
    const days = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    return `${days[date.getDay()]}, ${date.getDate()}. ${MONTHS_DE[date.getMonth()]} ${date.getFullYear()}`;
  }

  /* Widget state */
  let currentYear, currentMonth;
  let selectedDate   = null;
  let selectedTime   = null;
  let selectedDateStr = '';

  const widget    = document.getElementById('booking-widget');
  if (!widget) return; // guard

  const step1     = document.getElementById('booking-step-1');
  const step2     = document.getElementById('booking-step-2');
  const step3     = document.getElementById('booking-step-3');
  const step4     = document.getElementById('booking-step-4');
  const calGrid   = document.getElementById('cal-grid');
  const calMonth  = document.getElementById('cal-month');
  const slotsGrid = document.getElementById('slots-grid');
  const slotsDate = document.getElementById('slots-date');
  const formSel   = document.getElementById('form-selection');
  const confirmTx = document.getElementById('confirm-text');
  const progSteps = widget.querySelectorAll('.booking-progress__step');

  /* Init with current month */
  const now = new Date();
  currentYear  = now.getFullYear();
  currentMonth = now.getMonth();

  renderCalendar();

  /* Month navigation */
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    const prev = new Date(currentYear, currentMonth - 1, 1);
    const minDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (prev < minDate) return;
    currentMonth = prev.getMonth();
    currentYear  = prev.getFullYear();
    renderCalendar();
  });

  document.getElementById('cal-next')?.addEventListener('click', () => {
    const next = new Date(currentYear, currentMonth + 1, 1);
    // Max 3 months ahead
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    if (next > maxDate) return;
    currentMonth = next.getMonth();
    currentYear  = next.getFullYear();
    renderCalendar();
  });

  /* Render calendar grid */
  function renderCalendar() {
    calMonth.textContent = `${MONTHS_DE[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1);
    // ISO week: Mon=0
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const today = new Date();
    today.setHours(0,0,0,0);

    calGrid.innerHTML = '';

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day cal-day--empty';
      empty.setAttribute('aria-hidden', 'true');
      calGrid.appendChild(empty);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.textContent = d;
      cell.classList.add('cal-day');

      const isToday = date.toDateString() === today.toDateString();
      if (isToday) cell.classList.add('cal-day--today');

      if (date < today) {
        cell.classList.add('cal-day--past');
        cell.setAttribute('aria-disabled', 'true');
        cell.setAttribute('aria-label', `${d}. ${MONTHS_DE[currentMonth]} — vergangen`);
      } else if (!isDayAvailable(date)) {
        cell.classList.add('cal-day--unavailable');
        cell.setAttribute('aria-disabled', 'true');
        cell.setAttribute('aria-label', `${d}. ${MONTHS_DE[currentMonth]} — ausgebucht`);
      } else {
        cell.classList.add('cal-day--available');
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `${formatDateDE(date)} — verfügbar, Termin wählen`);
        cell.addEventListener('click', () => selectDate(date, cell));
        cell.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDate(date, cell); }
        });
      }

      // Mark selected
      if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
        cell.classList.add('cal-day--selected');
      }

      calGrid.appendChild(cell);
    }

    // Legend
    let legend = widget.querySelector('.booking-calendar__legend');
    if (!legend) {
      legend = document.createElement('div');
      legend.className = 'booking-calendar__legend';
      legend.setAttribute('aria-hidden', 'true');
      legend.innerHTML = `
        <span class="legend-item"><span class="legend-dot legend-dot--available"></span>Verfügbar</span>
        <span class="legend-item"><span class="legend-dot legend-dot--unavailable"></span>Ausgebucht</span>
      `;
      step1.querySelector('.booking-calendar').appendChild(legend);
    }
  }

  /* Date selected → show time slots */
  async function selectDate(date, cell) {
    selectedDate    = date;
    selectedDateStr = toDateStr(date);

    calGrid.querySelectorAll('.cal-day--selected').forEach(el => el.classList.remove('cal-day--selected'));
    cell.classList.add('cal-day--selected');

    slotsDate.textContent = formatDateDE(date);
    slotsGrid.innerHTML = '<p style="color:var(--color-muted);font-size:13px;padding:8px 0;">Lade Termine…</p>';
    goToStep(2);

    const { free = TIME_SLOTS, booked = [] } = await fetchSlots(selectedDateStr);

    slotsGrid.innerHTML = '';

    if (free.length === 0) {
      slotsGrid.innerHTML = '<p style="color:var(--color-muted);font-size:13px;padding:8px 0;">Keine freien Termine an diesem Tag.</p>';
      return;
    }

    TIME_SLOTS.forEach(slot => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = slot + ' Uhr';
      btn.classList.add('slot-btn');

      if (booked.includes(slot)) {
        btn.classList.add('slot-btn--booked');
        btn.disabled = true;
        btn.setAttribute('aria-label', `${slot} Uhr — gebucht`);
      } else {
        btn.setAttribute('aria-label', `${slot} Uhr — verfügbar`);
        btn.addEventListener('click', () => selectSlot(slot));
      }

      slotsGrid.appendChild(btn);
    });
  }

  /* Slot selected → show form */
  function selectSlot(time) {
    selectedTime = time;
    formSel.textContent = `${formatDateDE(selectedDate)} um ${time} Uhr`;
    goToStep(3);
    // Focus first form field
    setTimeout(() => document.getElementById('b-name')?.focus(), 100);
  }

  /* Back buttons */
  document.getElementById('slots-back')?.addEventListener('click', () => goToStep(1));
  document.getElementById('form-back')?.addEventListener('click',  () => goToStep(2));

  /* Step management */
  function goToStep(n) {
    [step1, step2, step3, step4].forEach((s, i) => {
      if (!s) return;
      const isTarget = i + 1 === n;
      s.hidden = !isTarget;
      if (isTarget) s.removeAttribute('hidden');
    });

    // Update progress indicators
    progSteps.forEach(s => {
      const sn = parseInt(s.dataset.step);
      s.classList.toggle('is-active', sn === n);
      s.classList.toggle('is-done',   sn < n);
    });
  }

  /* Booking form submission */
  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.querySelectorAll('[required]').forEach(field => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') clearError(field);
      });
    });

    bookingForm.addEventListener('submit', async e => {
      e.preventDefault();
      let firstInvalid = null;
      let valid = true;

      bookingForm.querySelectorAll('[required]').forEach(field => {
        if (!validateField(field)) { valid = false; if (!firstInvalid) firstInvalid = field; }
      });

      if (!valid) { firstInvalid?.focus(); return; }

      const name    = document.getElementById('b-name')?.value.trim()    || '';
      const company = document.getElementById('b-company')?.value.trim() || '';
      const email   = document.getElementById('b-email')?.value.trim()   || '';
      const phone   = document.getElementById('b-phone')?.value.trim()   || '';
      const project = document.getElementById('b-project')?.value.trim() || '';

      /* ── Google Apps Script senden (wenn URL hinterlegt) ── */
      if (APPS_SCRIPT_URL) {
        const submitBtn = bookingForm.querySelector('[type="submit"]');
        submitBtn.disabled   = true;
        submitBtn.textContent = 'Wird gebucht …';

        try {
          await fetch(APPS_SCRIPT_URL, {
            method:  'POST',
            mode:    'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              name, company, email, phone, project,
              date: selectedDateStr,
              time: selectedTime,
            }),
          });
        } catch (err) {
          // no-cors liefert immer opaque response — Fehler ignorieren
        }
      }

      /* ── Bestätigungsschritt anzeigen ───────────────────── */
      confirmTx.textContent =
        `${name}, Ihr Termin am ${formatDateDE(selectedDate)} um ${selectedTime} Uhr ist bestätigt.`;

      goToStep(4);
      step4.focus();
    });
  }

  /* ─── Contact form (message form) ─────────────────────── */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.querySelectorAll('[required]').forEach(field => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') clearError(field);
      });
    });

    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      let firstInvalid = null;
      let valid = true;

      contactForm.querySelectorAll('[required]').forEach(field => {
        if (!validateField(field)) { valid = false; if (!firstInvalid) firstInvalid = field; }
      });

      if (!valid) { firstInvalid?.focus(); return; }

      const name    = document.getElementById('c-name')?.value.trim()    || '';
      const email   = document.getElementById('c-email')?.value.trim()   || '';
      const message = document.getElementById('c-message')?.value.trim() || '';

      const subject = encodeURIComponent(`Kontaktanfrage von ${name}`);
      const body    = encodeURIComponent(`Name: ${name}\nE-Mail: ${email}\n\n${message}`);
      window.location.href = `mailto:kontakt@belisio.de?subject=${subject}&body=${body}`;
    });
  }

  /* ─── Form validation helpers ──────────────────────────── */
  function validateField(field) {
    const value = field.value.trim();
    let err = '';
    if (!value) err = 'Dieses Feld ist erforderlich.';
    else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      err = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
    }
    if (err) { showError(field, err); return false; }
    clearError(field);
    return true;
  }

  function showError(field, msg) {
    const id = field.id + '-error';
    let el   = document.getElementById(id);
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', id);
    if (!el) {
      el = document.createElement('span');
      el.id = id; el.className = 'form-error';
      el.setAttribute('role', 'alert');
      field.after(el);
    }
    el.textContent = msg;
  }

  function clearError(field) {
    const el = document.getElementById(field.id + '-error');
    field.setAttribute('aria-invalid', 'false');
    field.removeAttribute('aria-describedby');
    el?.remove();
  }

})();
