const sidebarToggleBtns = document.querySelectorAll(".sidebar-toggle");
const sidebar = document.querySelector(".sidebar");
const searchForm = document.querySelector(".search-form"); // optional
const themeToggleBtn = document.querySelector(".theme-toggle");
const themeIcon = themeToggleBtn.querySelector(".theme-icon");

// ---- Theme Handling ----

// Icon hängt nur von der aktuellen Theme-Klasse ab (nicht vom Sidebar-Zustand)
const updateThemeIcon = () => {
  const isDark = document.body.classList.contains("dark-theme");
  themeIcon.textContent = isDark ? "light_mode" : "dark_mode";
  themeToggleBtn.setAttribute(
    "aria-label",
    isDark ? "Switch to light theme" : "Switch to dark theme"
  );
  themeToggleBtn.setAttribute(
    "title",
    isDark ? "Switch to light theme" : "Switch to dark theme"
  );
};

// Initiale Theme-Setzung
const savedTheme = localStorage.getItem("theme");
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const shouldUseDarkTheme = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
document.body.classList.toggle("dark-theme", shouldUseDarkTheme);
updateThemeIcon();

// Theme umschalten
themeToggleBtn.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcon();
});

// ---- Sidebar Handling ----

// Sidebar ein-/ausklappen
sidebarToggleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    // Logos wechseln rein über CSS (logo-wide / logo-compact)
  });
});

// Auf Klick in die Suche Sidebar expandieren (falls vorhanden)
if (searchForm) {
  searchForm.addEventListener("click", () => {
    if (sidebar.classList.contains("collapsed")) {
      sidebar.classList.remove("collapsed");
      const input = searchForm.querySelector("input");
      if (input) input.focus();
    }
  });
}

// Standard: auf großen Screens Sidebar expandiert
if (window.innerWidth > 768) sidebar.classList.remove("collapsed");

// ---- Universal Document Footer Population ----
function populateDocFooters() {
  if (typeof reportData === 'undefined' || !reportData || !reportData.Project) return;
  const prj = reportData.Project;
  const s = (id, v) => {
    document.querySelectorAll('#' + id).forEach(e => {
      e.textContent = v || '-';
    });
  };
  s('foot-cus', prj.CUS_NAME);
  s('foot-projnr', prj.PRJ_NR);
  s('foot-eng', prj.ENGINEER);
  s('foot-projname', prj.PRJ_NAME);
  s('foot-projpos', prj.PRJ_POSITION);
  s('foot-report', (prj.REPORT_TYPE || '') + " | " + (prj.REPORT_VERSION || ''));
}

document.addEventListener('DOMContentLoaded', populateDocFooters);
window.addEventListener('load', populateDocFooters);


(() => {
  // Elemente
  const langBtn = document.querySelector('.lang-toggle');
  const popup   = document.querySelector('.lang-popup');
  const options = document.querySelectorAll('.lang-option');

  if (!langBtn || !popup) return;

  // --- Popup open/close (Context Popup) ---

  function markActiveLanguage() {
    if (!window.AVL_LANG) return;
    const current = window.AVL_LANG.getLang();

    options.forEach(btn => {
      const isActive = btn.dataset.lang === current;
      btn.classList.toggle('is-active', isActive);

      // optional a11y:
      if (btn.getAttribute('role') === 'menuitemradio') {
        btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
      }
    });
  }
  function openPopup() {
    popup.classList.add('open');
    popup.setAttribute('aria-hidden', 'false');

    markActiveLanguage();

    // Position: über dem Footer, zentriert über Language-Button
    const footer = langBtn.closest('.sidebar-footer');
    const btnRect = langBtn.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();

    // kurz sichtbar => Breite messen
    const popRect = popup.getBoundingClientRect();

    let left = (btnRect.left - footerRect.left) + (btnRect.width / 2) - (popRect.width / 2);
    left = Math.max(0, Math.min(left, footerRect.width - popRect.width));
    popup.style.left = `${left}px`;
  }

  function closePopup() {
    popup.classList.remove('open');
    popup.setAttribute('aria-hidden', 'true');
  }

  langBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (popup.classList.contains('open')) closePopup();
    else openPopup();
  });

  // Klick außerhalb schließt
  document.addEventListener('click', (e) => {
    if (!popup.classList.contains('open')) return;
    const inside = popup.contains(e.target) || langBtn.contains(e.target);
    if (!inside) closePopup();
  });

  // ESC schließt
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopup();
  });

  // --- i18n anwenden: nimmt data-i18n Keys ---
  function applyTranslations() {
    if (window.AVL_LANG && window.AVL_LANG.translateDOM) {
      window.AVL_LANG.translateDOM();
    }
  }

  // ? HIER ist „Punkt 6“: Klick auf Popup-Option => Sprache setzen + Übersetzen
  options.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;

      // Sprache speichern + <html lang> setzen
      window.AVL_LANG.setLang(lang);

      applyTranslations();
      markActiveLanguage();
      closePopup();
    });
  });

  // Init beim Laden
  // (Wenn schon Sprache gespeichert ist, wird alles korrekt gesetzt)
  applyTranslations();
  markActiveLanguage();
})();

// ── Unit Format Switcher ─────────────────────────────────────────────────────
(() => {
  const btn     = document.querySelector('.unit-toggle');
  const popup   = document.querySelector('.unit-popup');
  const options = document.querySelectorAll('.unit-option');

  if (!btn || !popup) return;

  function positionPopup() {
    const footer    = btn.closest('.sidebar-footer');
    const btnRect   = btn.getBoundingClientRect();
    const footerRect= footer.getBoundingClientRect();
    const popRect   = popup.getBoundingClientRect();
    let left = (btnRect.left - footerRect.left) + (btnRect.width / 2) - (popRect.width / 2);
    left = Math.max(0, Math.min(left, footerRect.width - popRect.width));
    popup.style.left = `${left}px`;
  }

  function markActive() {
    if (!window.AVL_UNITS) return;
    const current = window.AVL_UNITS.getFormat();
    options.forEach(o => {
      const isActive = o.dataset.unit === current;
      o.classList.toggle('is-active', isActive);
      if (o.getAttribute('role') === 'menuitemradio')
        o.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }

  function openPopup()  { popup.classList.add('open');    popup.setAttribute('aria-hidden', 'false'); markActive(); positionPopup(); }
  function closePopup() { popup.classList.remove('open'); popup.setAttribute('aria-hidden', 'true'); }

  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); popup.classList.contains('open') ? closePopup() : openPopup(); });
  document.addEventListener('click', e => { if (!popup.classList.contains('open')) return; if (!popup.contains(e.target) && !btn.contains(e.target)) closePopup(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePopup(); });

  options.forEach(o => {
    o.addEventListener('click', () => {
      if (window.AVL_UNITS) window.AVL_UNITS.setFormat(o.dataset.unit);
      markActive();
      closePopup();
    });
  });

  markActive();
})();

// ── CSV Delimiter Switcher ───────────────────────────────────────────────────
(() => {
  const btn     = document.querySelector('.csv-toggle');
  const popup   = document.querySelector('.csv-popup');
  const options = document.querySelectorAll('.csv-option');

  if (!btn || !popup) return;

  function positionPopup() {
    const footer    = btn.closest('.sidebar-footer');
    const btnRect   = btn.getBoundingClientRect();
    const footerRect= footer.getBoundingClientRect();
    const popRect   = popup.getBoundingClientRect();
    let left = (btnRect.left - footerRect.left) + (btnRect.width / 2) - (popRect.width / 2);
    left = Math.max(0, Math.min(left, footerRect.width - popRect.width));
    popup.style.left = `${left}px`;
  }

  function markActive() {
    if (!window.AVL_CSV) return;
    const current = window.AVL_CSV.getDelimiter();
    options.forEach(o => {
      const isActive = o.dataset.delim === current;
      o.classList.toggle('is-active', isActive);
      if (o.getAttribute('role') === 'menuitemradio')
        o.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }

  function openPopup()  { popup.classList.add('open');    popup.setAttribute('aria-hidden', 'false'); markActive(); positionPopup(); }
  function closePopup() { popup.classList.remove('open'); popup.setAttribute('aria-hidden', 'true'); }

  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); popup.classList.contains('open') ? closePopup() : openPopup(); });
  document.addEventListener('click', e => { if (!popup.classList.contains('open')) return; if (!popup.contains(e.target) && !btn.contains(e.target)) closePopup(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePopup(); });

  options.forEach(o => {
    o.addEventListener('click', () => {
      if (window.AVL_CSV) window.AVL_CSV.setDelimiter(o.dataset.delim);
      markActive();
      closePopup();
    });
  });

  markActive();
})();
