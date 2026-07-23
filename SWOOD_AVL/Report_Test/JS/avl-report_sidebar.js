const isIndex = window.location.pathname.toLowerCase().endsWith('report.html') || window.location.pathname.endsWith('/');
const rootPrefix = isIndex ? '' : '../../';
const htmlPrefix = isIndex ? 'https://av-line.github.io/SWOOD_AVL/Report_Test/HTML/' : '';

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

    <div class="sidebar-save-container" style="padding: 8px 18px; border-top: 1px solid var(--color-border-hr); display: flex; align-items: center; justify-content: center;">
      <button class="save-state-btn offline-export-btn" id="save-state-btn" aria-label="Save progress" data-i18n-aria="ui.save.label" data-i18n-title="ui.save.tooltip" title="Save progress" style="width: 40px; height: 40px; border-radius: 8px; border: none; background: var(--color-bg-secondary); color: var(--color-text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center;">
        <span class="material-symbols-rounded" aria-hidden="true" style="color: #28a745;">save</span>
      </button>
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

// ── Online SPA View Switcher ────────────────────────────────────────────────
(function() {
    if (window.AVL_OFFLINE_MODE) return;

    const views = ['overview', 'panels', 'cabinets', 'bigparts', 'laminates', 'cutting', 'programs', 'fittings', 'purchase', 'summary'];
    const loadedViews = new Set(['overview']);

    function ensureOverviewSection() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;
        if (!document.getElementById('view-overview')) {
            const overviewSec = document.createElement('section');
            overviewSec.id = 'view-overview';
            overviewSec.className = 'report-view';
            overviewSec.style.display = 'flex';
            overviewSec.style.flexDirection = 'column';
            overviewSec.style.height = '100%';
            
            while (mainContent.firstChild) {
                overviewSec.appendChild(mainContent.firstChild);
            }
            mainContent.appendChild(overviewSec);
        }
    }

    async function loadSubpageView(viewId) {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        let sec = document.getElementById('view-' + viewId);
        if (!sec) {
            sec = document.createElement('section');
            sec.id = 'view-' + viewId;
            sec.className = 'report-view';
            sec.style.display = 'none';
            sec.style.flexDirection = 'column';
            sec.style.height = '100%';
            sec.style.padding = '20px';
            sec.style.boxSizing = 'border-box';
            mainContent.appendChild(sec);

            try {
                const fetchUrl = `${htmlPrefix}${viewId}.html`;
                const response = await fetch(fetchUrl);
                if (response.ok) {
                    const htmlText = await response.text();
                    
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlText, 'text/html');
                    const subMain = doc.querySelector('.main-content');
                    if (subMain) {
                        sec.innerHTML = subMain.innerHTML;
                    } else {
                        sec.innerHTML = doc.body ? doc.body.innerHTML : htmlText;
                    }

                    // Copy all <style> elements from fetched subpage into document.head
                    doc.querySelectorAll('style').forEach(styleTag => {
                        const cloned = styleTag.cloneNode(true);
                        cloned.setAttribute('data-subpage-style', viewId);
                        document.head.appendChild(cloned);
                    });

                    // Copy any modal dialogs (like #panel-modal, #program-modal, etc.)
                    doc.querySelectorAll('.modal, [id$="-modal"]').forEach(modalEl => {
                        if (modalEl.id && !document.getElementById(modalEl.id)) {
                            document.body.appendChild(modalEl.cloneNode(true));
                        }
                    });

                    if (window.AVL_LANG && window.AVL_LANG.translateDOM) {
                        window.AVL_LANG.translateDOM();
                    }
                    loadedViews.add(viewId);
                } else {
                    sec.innerHTML = `<div style="padding:40px;color:red;">Failed to load view: ${viewId}</div>`;
                }
            } catch(e) {
                console.error('Error fetching view:', viewId, e);
                sec.innerHTML = `<div style="padding:40px;color:red;">Error loading view ${viewId}</div>`;
            }
        }
    }

    async function showView(viewId) {
        if (!views.includes(viewId)) viewId = 'overview';
        ensureOverviewSection();

        if (viewId !== 'overview' && !loadedViews.has(viewId)) {
            await loadSubpageView(viewId);
        }

        if (window.populateDocFooters) window.populateDocFooters();
        if (window.AVL_LANG && window.AVL_LANG.translateDOM) window.AVL_LANG.translateDOM();

        views.forEach(v => {
            const sec = document.getElementById('view-' + v);
            if (sec) {
                if (v === viewId) {
                    sec.style.display = 'flex';
                    sec.style.flexDirection = 'column';
                    sec.style.height = '100%';
                } else {
                    sec.style.display = 'none';
                }
            }

            const navEl = document.querySelector('[data-nav-id="' + v + '"]');
            if (navEl) {
                const link = navEl.querySelector('.menu-link');
                if (link) {
                    if (v === viewId) link.classList.add('active');
                    else link.classList.remove('active');
                }
            }
        });

        window.dispatchEvent(new CustomEvent('avl:viewChanged', { detail: { view: viewId } }));

        function safeRedrawView(vid) {
            try {
                const activeSec = document.getElementById('view-' + vid);
                if (activeSec && typeof Tabulator !== 'undefined' && Tabulator.findTable) {
                    const containers = activeSec.querySelectorAll('.tabulator, [id^="data-table"], #panels-table, #cabinets-table, #bigparts-table, #laminates-table, #cutting-table, #programs-table, #fittings-table, #purchase-table, #bp-summary-table, #detail-smallparts-table');
                    containers.forEach(el => {
                        if (el.offsetParent !== null) {
                            const tbls = Tabulator.findTable(el);
                            if (tbls && tbls.length > 0) {
                                const tbl = tbls[0];
                                const cols = tbl.getColumnDefinitions();
                                if (cols && cols.length > 0) tbl.setColumns(cols);
                                else tbl.redraw(true);
                            }
                        }
                    });
                }
            } catch(e) {}
        }
        requestAnimationFrame(() => {
            setTimeout(() => safeRedrawView(viewId), 150);
            setTimeout(() => safeRedrawView(viewId), 500);
        });
    }

    function bindSidebarNavigation() {
        document.querySelectorAll('.sidebar [data-nav-id]').forEach(item => {
            const navId = item.getAttribute('data-nav-id');
            const link = item.querySelector('.menu-link');
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    showView(navId);
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            ensureOverviewSection();
            bindSidebarNavigation();
        });
    } else {
        ensureOverviewSection();
        bindSidebarNavigation();
    }

    window.AVL_SHOW_VIEW = showView;
})();
