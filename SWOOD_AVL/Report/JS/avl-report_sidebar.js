const isIndex = window.location.pathname.toLowerCase().endsWith('report.html') || window.location.pathname.endsWith('/');
const rootPrefix = isIndex ? '' : '../../';
const htmlPrefix = isIndex ? '_SOURCE/HTML/' : '';

// Dynamically determine the root file name from tabledata.js if available
let overviewLink = `${rootPrefix}REPORT.html`;
if (typeof reportData !== 'undefined' && reportData.Project && reportData.Project.FILENAME) {
    overviewLink = `${rootPrefix}${reportData.Project.FILENAME}_REPORT.html`;
} else if (isIndex) {
    const pathParts = window.location.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    if (fileName && fileName.toLowerCase().endsWith('report.html')) {
        overviewLink = fileName;
    }
}

// ── Visibility Logic ────────────────────────────────────────────────────────
const getSidebarCounts = () => {
    try {
        if (typeof reportData === 'undefined' || !reportData || !reportData.Project) return null;
        const proj = reportData.Project;
        const getArray = (v) => {
            if (!v) return [];
            if (Array.isArray(v)) return v;
            if (typeof v === 'object') return [v];
            return [];
        };
        
        const cabinets = getArray(proj.CABINET);
        const internalParts = getArray(proj.INTERNALPRODUCTION);
        const bigParts = getArray(proj.BIGPART);
        const fittings = getArray(proj.FITTING);
        const fittingsEfi = getArray(proj.FITTING_EFICAD);
        const external = getArray(proj.EXTERNALPRODUCTION);

        const cabFilenames = new Set(cabinets.map(c => c.FILENAME).filter(Boolean));
        
        let totalParts = 0;
        let totalLaminated = 0;
        let totalCNC = 0;
        
        internalParts.forEach(p => {
            if (p.FILENAME && cabFilenames.has(p.FILENAME)) return;
            const q = parseInt(p.QTY || p.QUANTITY || 1, 10) || 0;
            totalParts += q;
            if (p.PAN_LAMTOP_MATREF || p.PAN_LAMBOT_MATREF) totalLaminated += q;
            getArray(p.PROGRAMS).forEach(pr => { 
                if (pr && pr.PROG_FILENAME && String(pr.PROG_FILENAME).trim() !== "") {
                    totalCNC++; 
                }
            });
        });

        const c = {
            panels: totalParts,
            cabinets: cabinets.length,
            bigparts: bigParts.length,
            laminates: totalLaminated,
            cutting: totalParts, 
            programs: totalCNC,
            fittings: fittings.length + fittingsEfi.length,
            purchase: external.length,
            summary: (totalParts > 0 || fittings.length > 0 || fittingsEfi.length > 0 || external.length > 0) ? 1 : 0
        };
        return c;
    } catch (e) {
        console.warn("Sidebar: Error calculating counts", e);
        return null;
    }
};

const updateSidebarVisibility = () => {
    const counts = getSidebarCounts();
    if (!counts) return false;

    const items = {
        'panels': counts.panels,
        'cabinets': counts.cabinets,
        'bigparts': counts.bigparts,
        'laminates': counts.laminates,
        'cutting': counts.cutting,
        'programs': counts.programs,
        'fittings': counts.fittings,
        'purchase': counts.purchase,
        'summary': counts.summary
    };

    Object.keys(items).forEach(key => {
        const el = document.querySelector(`[data-nav-id="${key}"]`);
        if (el) {
            if (items[key] <= 0) {
                el.style.setProperty('display', 'none', 'important');
            } else {
                el.style.display = '';
            }
        }
    });
    return true;
};

const sidebarHTML = `
  <aside class="sidebar collapsed">
    <div class="sidebar-header">
      <a href="https://www.av-line.de/" target="_blank">
        <img src="https://av-line.github.io/images/LogoAVLine.webp" alt="AV-Line" class="header-logo logo-wide" />
      </a>
      <a href="https://www.av-line.de/" target="_blank">
        <img src="https://av-line.github.io/images/LogoAV.webp" alt="AV" class="header-logo logo-compact" />
      </a>
      <button class="sidebar-toggle" aria-label="Toggle sidebar" title="Toggle sidebar">
        <span class="material-symbols-rounded">chevron_left</span>
      </button>
    </div>

    <div class="sidebar-content">
      <ul class="menu-list">
        <li class="menu-item" data-nav-id="overview">
          <a href="${overviewLink}" class="menu-link" id="nav-overview-link">
            <span class="material-symbols-rounded">dashboard</span>
            <span class="menu-label" data-i18n="menu.overview"></span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="panels">
          <a href="${htmlPrefix}panels.html" class="menu-link">
            <span class="material-symbols-rounded">reorder</span>
            <span class="menu-label" data-i18n="menu.panels"></span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="cabinets">
          <a href="${htmlPrefix}cabinets.html" class="menu-link">
            <span class="material-symbols-rounded">kitchen</span>
            <span class="menu-label" data-i18n="menu.cabinets"></span>
          </a>
        </li>            
        <li class="menu-item" data-nav-id="bigparts">
          <a href="${htmlPrefix}bigparts.html" class="menu-link">
            <span class="material-symbols-rounded">dataset</span>
            <span class="menu-label" data-i18n="page.title.bigparts"></span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="laminates">
          <a href="${htmlPrefix}laminates.html" class="menu-link">
            <span class="material-symbols-rounded">layers</span>
            <span class="menu-label" data-i18n="menu.laminates"></span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="cutting">
          <a href="${htmlPrefix}cutting.html" class="menu-link">
            <span class="material-symbols-rounded">full_stacked_bar_chart</span>
            <span class="menu-label" data-i18n="menu.cutting"></span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="programs">
          <a href="${htmlPrefix}programs.html" class="menu-link">
            <span class="material-symbols-rounded">qr_code</span>
            <span class="menu-label" data-i18n="menu.cncprograms"></span>
          </a>
        </li>        
        <li class="menu-item" data-nav-id="fittings">
          <a href="${htmlPrefix}fittings.html" class="menu-link">
            <span class="material-symbols-rounded">shelves</span>
            <span class="menu-label" data-i18n="menu.fittings"></span>
          </a>
        </li>    
        <li class="menu-item" data-nav-id="purchase">
          <a href="${htmlPrefix}purchase.html" class="menu-link">
            <span class="material-symbols-rounded">draft</span>
            <span class="menu-label" data-i18n="menu.purchase"></span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="summary">
          <a href="${htmlPrefix}summary.html" class="menu-link">
            <span class="material-symbols-rounded">insert_chart</span>
            <span class="menu-label" data-i18n="menu.summary"></span>
          </a>
        </li>                
      </ul>
    </div>

    <div class="sidebar-footer">
      <button class="lang-toggle" aria-label="Language" data-i18n-aria="ui.lang" data-i18n-title="ui.lang" title="Language">
        <span class="material-symbols-rounded" aria-hidden="true">language</span>
      </button>
      <button class="unit-toggle" aria-label="Unit Format" data-i18n-aria="ui.units" data-i18n-title="ui.units" title="Unit Format">
        <span class="material-symbols-rounded" aria-hidden="true">square_foot</span>
      </button>
      <button class="csv-toggle" aria-label="CSV Delimiter" data-i18n-aria="ui.csv" data-i18n-title="ui.csv" title="CSV Delimiter">
        <span class="material-symbols-rounded" aria-hidden="true">edit_document</span>
      </button>
      <button class="theme-toggle" aria-label="Toggle theme" data-i18n-aria="ui.theme" data-i18n-title="ui.theme" title="Toggle theme">
        <span class="theme-icon material-symbols-rounded" aria-hidden="true"></span>
      </button>

      <!-- Language popup -->
      <div class="lang-popup" role="menu" aria-hidden="true">
        <button class="lang-option" type="button" data-lang="de" data-i18n="ui.lang.de" role="menuitemradio"></button>
        <button class="lang-option" type="button" data-lang="en" data-i18n="ui.lang.en" role="menuitemradio"></button>
      </div>

      <!-- Unit format popup -->
      <div class="unit-popup" role="menu" aria-hidden="true">
        <button class="unit-option" type="button" data-unit="metric"            data-i18n="ui.units.metric"            role="menuitemradio"></button>
        <button class="unit-option" type="button" data-unit="imperial_decimal"  data-i18n="ui.units.imperial_decimal"  role="menuitemradio"></button>
        <button class="unit-option" type="button" data-unit="imperial_fraction" data-i18n="ui.units.imperial_fraction" role="menuitemradio"></button>
      </div>

      <!-- CSV delimiter popup -->
      <div class="csv-popup" role="menu" aria-hidden="true">
        <button class="csv-option" type="button" data-delim=";"  data-i18n="ui.csv.semicolon" role="menuitemradio"></button>
        <button class="csv-option" type="button" data-delim=","  data-i18n="ui.csv.comma"     role="menuitemradio"></button>
        <button class="csv-option" type="button" data-delim="&#9;" data-i18n="ui.csv.tab"     role="menuitemradio"></button>
      </div>
    </div>
  </aside>
`;

if (!window.AVL_OFFLINE_MODE && !document.querySelector('aside.sidebar')) {
    document.write(sidebarHTML);
}

// Robust injection & visibility check
(function() {
    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(() => {
        const success = updateSidebarVisibility();
        attempts++;
        if (success || attempts >= maxAttempts) {
            clearInterval(interval);
        }
    }, 100);

    window.addEventListener('DOMContentLoaded', updateSidebarVisibility);
    window.addEventListener('load', updateSidebarVisibility);
})();

(function () {
  let currentUrl = window.location.pathname.split('/').pop().toLowerCase();
  if (!currentUrl || currentUrl === '/') currentUrl = 'report.html';
  const links = document.querySelectorAll('.sidebar .menu-link');
  links.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href').toLowerCase();
    if (href === currentUrl || (currentUrl.includes('_report.html') && href.includes('report.html'))) {
      link.classList.add('active');
    }
  });
})();
