const fs = require('fs');
const path = require('path');

const baseDir = 'c:/_AVLine/DevReport';

// 1. Package ALL JS engine modules
const jsFiles = [
    'avl-report_units.js',
    'avl-report_csv.js',
    'avl-report_lang.js',
    'avl-report_script.js',
    'avl-report_save.js',
    'avl-report_labels.js',
    'avl-report_paneldetails.js',
    'avl-report_pdf-export-v2.js',
    'avl-report_panel-table.js',
    'avl-report_cabinets-logic.js',
    'avl-report_bigparts-logic.js',
    'avl-report_laminates-table.js',
    'avl-report_cutting.js',
    'avl-report_programs-table.js',
    'avl-report_fitting-tables.js',
    'avl-report_purchase-table.js',
    'avl-report_summary-tables.js',
    'avl-report_dashboard-logic.js',
    'avl-report_viewer-logic.js'
];

let bundledJS = '';
jsFiles.forEach(relPath => {
    const fullPath = path.join(__dirname, relPath);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(/\.\.\/IMG\//g, '_SOURCE/IMG/');
        bundledJS += `\n/* ── Source: _SOURCE/JS/${relPath} ── */\n(function() {\n${content}\n})();\n`;
    }
});

function extractInlineStyles(html) {
    const styleBlocks = [];
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let m;
    while ((m = styleRegex.exec(html)) !== null) {
        styleBlocks.push(m[1]);
    }
    return styleBlocks.join('\n');
}

function extractMainContent(spId, html) {
    const startIdx = html.indexOf('<div class="main-content"');
    if (startIdx === -1) return '';

    const contentStart = html.indexOf('>', startIdx) + 1;
    let depth = 1;

    const regex = /<\/?div[\s>]/gi;
    regex.lastIndex = contentStart;

    let match;
    let contentEnd = html.length;

    while ((match = regex.exec(html)) !== null) {
        const fullMatch = match[0];
        if (fullMatch.startsWith('</')) {
            depth--;
        } else {
            depth++;
        }

        if (depth === 0) {
            contentEnd = match.index;
            break;
        }
    }

    let content = html.substring(contentStart, contentEnd);

    // Capture modal markup that lives outside main-content for specific subpages
    const modalIds = {
        'panels': ['panel-modal'],
        'bigparts': ['panel-modal'],
        'cabinets': ['panel-modal']
    };
    const idsToCapture = modalIds[spId] || [];
    idsToCapture.forEach(modalId => {
        const modalStart = html.indexOf(`<div id="${modalId}"`);
        if (modalStart !== -1) {
            let mDepth = 0;
            const mRegex = /<\/?div[\s>]/gi;
            mRegex.lastIndex = modalStart;
            let mMatch;
            let modalEnd = html.length;
            while ((mMatch = mRegex.exec(html)) !== null) {
                if (mMatch[0].startsWith('</')) {
                    mDepth--;
                    if (mDepth === 0) {
                        modalEnd = html.indexOf('>', mMatch.index) + 1;
                        break;
                    }
                } else {
                    mDepth++;
                }
            }
            content += '\n' + html.substring(modalStart, modalEnd);
        }
    });

    if (spId === 'overview') {
        content = content.replace(/<button[^>]*id=["']export-offline-btn["'][\s\S]*?<\/button>/gi, '');
    }

    content = content.replace(/<script[^>]*src=["'][^"']*["'][^>]*>\s*<\/script>/gi, '');
    content = content.replace(/\.\.\/IMG\//g, '_SOURCE/IMG/');
    content = content.replace(/\/IMG\//g, '_SOURCE/IMG/');
    return content;
}

// 2. Pre-extract all 10 Subpage HTML Templates directly from source HTML files
const subpages = [
    { id: 'overview', file: 'REPORT.html' },
    { id: 'panels', file: '_SOURCE/HTML/panels.html' },
    { id: 'cabinets', file: '_SOURCE/HTML/cabinets.html' },
    { id: 'bigparts', file: '_SOURCE/HTML/bigparts.html' },
    { id: 'laminates', file: '_SOURCE/HTML/laminates.html' },
    { id: 'cutting', file: '_SOURCE/HTML/cutting.html' },
    { id: 'programs', file: '_SOURCE/HTML/programs.html' },
    { id: 'fittings', file: '_SOURCE/HTML/fittings.html' },
    { id: 'purchase', file: '_SOURCE/HTML/purchase.html' },
    { id: 'summary', file: '_SOURCE/HTML/summary.html' }
];

const subpageTemplates = {};
let subpageCSSCollection = '';

subpages.forEach(sp => {
    const fullPath = path.join(baseDir, sp.file);
    if (fs.existsSync(fullPath)) {
        const html = fs.readFileSync(fullPath, 'utf8');
        subpageTemplates[sp.id] = extractMainContent(sp.id, html);
        // Extract page-specific inline styles from <style> blocks
        const pageCSS = extractInlineStyles(html);
        if (pageCSS.trim()) {
            subpageCSSCollection += `\n/* ── Subpage CSS: ${sp.id} ── */\n${pageCSS}\n`;
        }
    }
});

const exporterCode = `/* avl-report_offline-export.js
   Single-File Offline Report Generator for AV-Line Reports
   ─────────────────────────────────────────────────────────────
   Creates a 100% self-contained standalone offline HTML report.
   Inlines master CSS, sidebar HTML, pre-extracted HTML templates for ALL 10 subpages,
   and ALL 19 JavaScript engine modules with IIFE isolation.
*/

(function () {
    'use strict';

    // ── Inlined Master JS Code (IIFE Isolated) ───────────────────────────────
    const INLINED_ENGINE_JS = ${JSON.stringify(bundledJS)};

    // ── Pre-Extracted Subpage HTML Templates ────────────────────────────────
    const INLINED_SUBPAGE_TEMPLATES = ${JSON.stringify(subpageTemplates)};

    // ── Pre-Extracted Subpage CSS (page-specific inline styles) ──────────────
    const INLINED_SUBPAGE_CSS = ${JSON.stringify(subpageCSSCollection)};

    // ── Master CSS Fallback ───────────────────────────────────────────────────
    const EMBEDDED_MASTER_CSS = \`
/* avl-report_colors.css */
:root {
  --color-text-primary: #000000;
  --color-text-placeholder: #0099d9;
  --color-text-secondary: #666666;
  --color-bg-primary: #f5f5f5;
  --color-bg-secondary: #eaeaea;
  --color-bg-sidebar: #f5f5f5;
  --color-border-hr: #0099d9;
  --color-hover-primary: #0099d9;
  --color-hover-secondary: #dcdcdc;
  --color-active-primary: #0099d9;
  --color-shadow: rgba(0, 0, 0, 0.05);
  --color-shadow-hover: rgba(0, 0, 0, 0.15);
  --color-shadow-popup: rgba(0, 0, 0, 0.35);
  --color-overlay-bg: rgba(0, 0, 0, 0.5);
  --color-overlay-mobile: rgba(0, 0, 0, 0.6);
  --color-done-bg: #C6EFCE;
  --color-done-text: #000000;
  --color-sel-bg: rgba(0, 153, 217, 0.1);
  --color-sel-border: rgba(0, 153, 217, 0.3);
  --color-sel-row-bg: rgba(0, 153, 217, 0.14);
  --color-sel-row-hover: rgba(0, 153, 217, 0.22);
  --color-sel-row-border: rgba(0, 153, 217, 0.5);
  --color-focus-ring: rgba(0, 153, 217, 0.2);
  --color-cab-0: #3B82F6;
  --color-cab-1: #10B981;
  --color-cab-2: #F59E0B;
  --color-cab-3: #EF4444;
  --color-cab-4: #8B5CF6;
  --color-cab-5: #06B6D4;
  --color-cab-6: #F97316;
  --color-cab-7: #EC4899;
  --color-cab-8: #84CC16;
  --color-cab-9: #14B8A6;
  --color-cab-10: #A855F7;
  --color-cab-11: #6366F1;
  --color-cab-12: #F43F5E;
  --color-cab-13: #0EA5E9;
  --color-cab-14: #D97706;
  --color-cab-nocab: #9ca3af;
  --color-donut-production: #0099d9;
  --color-donut-cabinets: #3B82F6;
  --color-donut-bigparts: #10B981;
  --color-donut-laminates: #8B5CF6;
  --color-donut-programs: #06B6D4;
  --color-donut-fittings: #EC4899;
  --color-donut-purchase: #84CC16;
}

body.dark-theme {
  --color-text-primary: #f5f5f5;
  --color-text-placeholder: #0099d9;
  --color-text-secondary: #999999;
  --color-bg-primary: #121212;
  --color-bg-secondary: #2a2a2a;
  --color-bg-sidebar: #222222;
  --color-cab-nocab: #4b5563;
  --color-border-hr: #0099d9;
  --color-hover-primary: #0099d9;
  --color-hover-secondary: #333333;
  --color-active-primary: #0099d9;
  --color-shadow: rgba(0, 0, 0, 0.3);
  --color-shadow-hover: rgba(0, 0, 0, 0.5);
}

/* avl-report_style.css */
* { margin: 0; padding: 0; box-sizing: border-box; font-family: "Open Sans", sans-serif; font-size: small; }
body { min-height: 100vh; background: var(--color-bg-primary); }
.container { display: flex; width: 100vw; height: 100vh; overflow: hidden; }
.container .main-content { flex: 1; padding: 20px; color: var(--color-text-primary); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.main-content .page-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 20px; }
.main-content .card { border-radius: 8px; padding: 20px; background-color: var(--color-bg-sidebar); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.site-nav { top: 0; display: none; padding: 15px 20px; position: sticky; background: var(--color-bg-primary); border-bottom: 1px solid var(--color-border-hr); }
.sidebar { position: sticky; top: 0; width: 200px; height: 100vh; display: flex; flex-shrink: 0; flex-direction: column; background: var(--color-bg-sidebar); border-right: 1px solid var(--color-border-hr); box-shadow: 0 3px 9px var(--color-shadow); transition: width 0.3s ease; z-index: 100; }
.sidebar.collapsed { width: 90px; }
.sidebar .sidebar-header { padding: 20px 18px; display: flex; position: relative; align-items: center; justify-content: center; border-bottom: 1px solid var(--color-border-hr); height: 80px; }
.sidebar-header .header-logo { position: absolute; inset: 0; margin: auto; max-width: 140px; max-height: 48px; width: auto; height: auto; object-fit: contain; transition: opacity 0.25s ease; }
.logo-wide { opacity: 1; }
.logo-compact { opacity: 0; }
.sidebar.collapsed .logo-wide { opacity: 0; pointer-events: none; }
.sidebar.collapsed .logo-compact { opacity: 1; pointer-events: auto; max-width: 60px; max-height: 60px; }
.sidebar-toggle { height: 25px; width: 25px; border: none; cursor: pointer; display: flex; position: absolute; right: -12px; transform: translateY(-50%); align-items: center; justify-content: center; border-radius: 1px; color: var(--color-text-primary); background: var(--color-bg-secondary); transition: 0.3s ease; z-index: 110; }
.sidebar.collapsed .sidebar-toggle span { transform: rotate(180deg); }
.sidebar .sidebar-content { flex: 1; padding: 20px 18px; overflow: hidden auto; }
.sidebar-content .menu-list { display: flex; gap: 4px; list-style: none; flex-direction: column; }
.menu-list .menu-link { display: flex; gap: 12px; white-space: nowrap; border-radius: 2px; padding: 12px 15px; align-items: center; text-decoration: none; color: var(--color-text-primary); transition: 0.3s ease; }
.sidebar.collapsed .menu-link .menu-label { opacity: 0; pointer-events: none; display: none; }
.menu-list .menu-link:is(:hover, .active) { color: var(--color-active-primary); background: transparent; border-left: var(--color-hover-primary) 2px solid; }

.sidebar .sidebar-footer { padding: 0; border-top: 1px solid var(--color-border-hr); display: flex; flex-direction: row; align-items: center; justify-content: center; flex-wrap: nowrap; height: 80px; margin-top: auto; gap: clamp(4px, 0.8vw, 12px); position: relative; }
.sidebar.collapsed .sidebar-footer { flex-direction: column; height: auto; min-height: 0; padding: 10px 0; gap: 6px; align-items: center; justify-content: flex-end; }
.sidebar-footer .lang-toggle, .sidebar-footer .unit-toggle, .sidebar-footer .csv-toggle, .sidebar-footer .offline-export-btn, .sidebar-footer .theme-toggle { height: 40px; width: 40px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; border: none; padding: 0; flex-shrink: 0; color: var(--color-text-primary); background: var(--color-bg-secondary); transition: background-color 0.2s ease, color 0.2s ease, transform 0.05s ease; }
.sidebar-footer .lang-toggle:hover, .sidebar-footer .unit-toggle:hover, .sidebar-footer .csv-toggle:hover, .sidebar-footer .offline-export-btn:hover, .sidebar-footer .theme-toggle:hover { background: var(--color-hover-secondary); outline: none; }

.lang-popup, .unit-popup, .csv-popup { position: absolute; bottom: calc(100% + 10px); left: 0; min-width: 175px; padding: 6px; border-radius: 12px; display: none !important; flex-direction: column; gap: 4px; background: var(--color-bg-primary); color: var(--color-text-primary); border: 1px solid var(--color-border-hr); box-shadow: 0 14px 35px rgba(0,0,0,0.35); z-index: 9999; }
.lang-popup.open, .unit-popup.open, .csv-popup.open { display: flex !important; }
.lang-option, .unit-option, .csv-option { display: block; width: 100%; text-align: left; padding: 9px 28px 9px 12px; border: 0; border-radius: 8px; background: transparent; color: inherit; cursor: pointer; font: inherit; font-size: 0.88rem; white-space: nowrap; }
.lang-option:hover, .unit-option:hover, .csv-option:hover { background: var(--color-hover-secondary); }
.lang-option.is-active, .unit-option.is-active, .csv-option.is-active { font-weight: 600; color: var(--color-text-placeholder); }

/* avl-report_dashboard.css */
.dashboard-split { display: grid; grid-template-columns: 35% 1fr; gap: 1.5rem; height: calc(100vh - 100px); min-height: 600px; }
@media (max-width: 1024px) { .dashboard-split { grid-template-columns: 1fr; height: auto; } }
.dashboard-info-card { background: var(--color-bg-sidebar); border: 1px solid var(--color-border-hr); border-radius: 2px; padding: 24px; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow-y: auto; }
.dashboard-info-card .project-header { margin-bottom: 24px; border-bottom: 1px solid var(--color-bg-secondary); padding-bottom: 16px; }
.dashboard-info-card .project-title { font-size: 1.5rem; font-weight: 600; color: var(--color-text-primary); margin: 0 0 8px 0; }
.dashboard-info-card .project-subtitle { font-size: 0.95rem; color: var(--color-text-secondary); margin: 0; display: flex; align-items: center; gap: 6px; }
.metadata-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: auto; }
.metadata-item { background: var(--color-bg-primary); border: 1px solid var(--color-bg-secondary); border-radius: 2px; padding: 12px 16px; }
.metadata-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-secondary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.metadata-value { font-size: 1.05rem; font-weight: 500; color: var(--color-text-primary); word-break: break-word; }
.metadata-item.full-width { grid-column: 1 / -1; }
.dashboard-chart-container { margin-top: 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.donut-chart-layout { display: flex; align-items: center; gap: 24px; padding: 10px 0; }
.donut-chart-box { position: relative; width: 140px; height: 140px; flex-shrink: 0; }
.donut-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.donut-ring-bg { stroke: var(--color-bg-secondary); opacity: 0.5; }
.donut-segment { fill: transparent; stroke-width: 9; transition: stroke-dasharray 1s ease-out; }
.donut-legend { flex-grow: 1; display: flex; flex-direction: column; gap: 8px; }
.legend-item { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; background-color: var(--item-color, var(--color-active-primary)); }
.legend-label { flex-grow: 1; color: var(--color-text-secondary); }
.legend-value { font-weight: 600; color: var(--color-text-primary); min-width: 25px; text-align: right; }
.viewer-card { flex: 1; padding: 0; border: 1px solid var(--color-bg-secondary); border-radius: 2px; overflow: hidden; display: flex; flex-direction: column; position: relative; }
.viewer-container { flex: 1; position: relative; background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-sidebar) 100%); width: 100%; height: 100%; }

/* Tabulator Theme Fixes */
.tabulator { margin-top: 1rem; border: 1px solid var(--color-bg-secondary); background-color: var(--color-bg-primary); color: var(--color-text-primary); font-family: inherit; }
.tabulator-header { border-bottom: 1px solid var(--color-border-hr) !important; color: var(--color-text-primary) !important; }
.tabulator-header .tabulator-col { background-color: var(--color-bg-sidebar) !important; color: var(--color-text-primary) !important; border-right: 1px solid var(--color-bg-secondary) !important; }
.tabulator-row { background-color: var(--color-bg-sidebar) !important; border-bottom: 1px solid var(--color-bg-secondary) !important; color: var(--color-text-primary) !important; }
.tabulator-row:nth-child(even) { background-color: var(--color-bg-primary) !important; }
.tabulator-row:hover { background-color: var(--color-hover-secondary) !important; cursor: default; }
.table-header-panel { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 0.5rem; gap: 0.5rem; flex-wrap: wrap; }
.export-menu-content { display: none; position: absolute; right: 0; top: 100%; margin-top: 5px; background-color: var(--color-bg-sidebar); border: 1px solid var(--color-bg-secondary); box-shadow: 0 4px 12px var(--color-shadow); z-index: 100; border-radius: 1px; overflow: hidden; min-width: 150px; }
.export-menu-content.show { display: flex; flex-direction: column; }
.export-menu-content button { background: none; border: none; padding: 10px 15px; text-align: left; color: var(--color-text-primary); cursor: pointer; border-bottom: 1px solid var(--color-bg-secondary); font-family: inherit; white-space: nowrap; }
.icon-action-btn { height: 38px; padding: 0 14px; border-radius: 4px; background-color: var(--color-bg-sidebar); border: 1px solid var(--color-border-hr); color: var(--color-text-primary); font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; }
.icon-action-btn:hover { background-color: var(--color-hover-secondary); border-color: var(--color-active-primary); color: var(--color-active-primary); }

/* Modal Styles */
.modal-overlay { position: fixed; inset: 0; z-index: 9999; background: var(--color-overlay-bg); display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.modal-overlay.open { display: flex; }
.modal-container, .modal-window { background: var(--color-bg-sidebar); border: 1px solid var(--color-border-hr); border-radius: 8px; width: 90%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px var(--color-shadow-popup); color: var(--color-text-primary); }
.modal-header { padding: 16px 24px; border-bottom: 1px solid var(--color-bg-secondary); display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 1.1rem; }
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--color-bg-secondary); display: flex; align-items: center; justify-content: space-between; }
.modal-close-btn, .modal-nav-btn { background: var(--color-bg-secondary); border: 1px solid var(--color-border-hr); color: var(--color-text-primary); border-radius: 4px; padding: 6px 12px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.modal-close-btn:hover, .modal-nav-btn:hover { background: var(--color-hover-secondary); color: var(--color-active-primary); }

/* SPA View Section styles */
.report-view {
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: auto;
}
\`;

    /** Always return complete master CSS */
    function getInlinedCSS() {
        let cssText = EMBEDDED_MASTER_CSS + '\\n';
        cssText += INLINED_SUBPAGE_CSS + '\\n';
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                const sheet = document.styleSheets[i];
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                    for (let j = 0; j < rules.length; j++) {
                        cssText += rules[j].cssText + '\\n';
                    }
                }
            } catch (e) { /* file:// security exception fallback */ }
        }
        return cssText;
    }

    /** Capture or generate current Sidebar HTML DOM element */
    function getSidebarHTML() {
        const activeSidebar = document.querySelector('aside.sidebar');
        if (activeSidebar) {
            let html = activeSidebar.outerHTML;
            html = html.replace(
                /<div class="sidebar-footer">/,
                '<div class="sidebar-footer">\\n      <div class="sidebar-offline-green-icon" title="Offline Report" style="position: absolute; top: -28px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; justify-content: center;">\\n        <span class="material-symbols-rounded" style="color: #10B981; font-size: 20px;">download_done</span>\\n      </div>'
            );
            return html;
        }

        return \`
  <aside class="sidebar">
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
          <a href="#" class="menu-link active" data-view="overview">
            <span class="material-symbols-rounded">dashboard</span>
            <span class="menu-label" data-i18n="menu.overview">Overview</span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="panels">
          <a href="#" class="menu-link" data-view="panels">
            <span class="material-symbols-rounded">reorder</span>
            <span class="menu-label" data-i18n="menu.panels">Panels</span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="cabinets">
          <a href="#" class="menu-link" data-view="cabinets">
            <span class="material-symbols-rounded">kitchen</span>
            <span class="menu-label" data-i18n="menu.cabinets">Cabinets</span>
          </a>
        </li>            
        <li class="menu-item" data-nav-id="bigparts">
          <a href="#" class="menu-link" data-view="bigparts">
            <span class="material-symbols-rounded">dataset</span>
            <span class="menu-label" data-i18n="page.title.bigparts">Big Parts</span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="laminates">
          <a href="#" class="menu-link" data-view="laminates">
            <span class="material-symbols-rounded">layers</span>
            <span class="menu-label" data-i18n="menu.laminates">Laminated Parts</span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="cutting">
          <a href="#" class="menu-link" data-view="cutting">
            <span class="material-symbols-rounded">full_stacked_bar_chart</span>
            <span class="menu-label" data-i18n="menu.cutting">Cutting</span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="programs">
          <a href="#" class="menu-link" data-view="programs">
            <span class="material-symbols-rounded">qr_code</span>
            <span class="menu-label" data-i18n="menu.cncprograms">CNC Programs</span>
          </a>
        </li>        
        <li class="menu-item" data-nav-id="fittings">
          <a href="#" class="menu-link" data-view="fittings">
            <span class="material-symbols-rounded">shelves</span>
            <span class="menu-label" data-i18n="menu.fittings">Fittings</span>
          </a>
        </li>    
        <li class="menu-item" data-nav-id="purchase">
          <a href="#" class="menu-link" data-view="purchase">
            <span class="material-symbols-rounded">draft</span>
            <span class="menu-label" data-i18n="menu.purchase">Purchase</span>
          </a>
        </li>
        <li class="menu-item" data-nav-id="summary">
          <a href="#" class="menu-link" data-view="summary">
            <span class="material-symbols-rounded">insert_chart</span>
            <span class="menu-label" data-i18n="menu.summary">Summary</span>
          </a>
        </li>                
      </ul>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-offline-green-icon" title="Offline Report" style="position: absolute; top: -28px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; justify-content: center;">
        <span class="material-symbols-rounded" style="color: #10B981; font-size: 20px;">download_done</span>
      </div>
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
        <span class="theme-icon material-symbols-rounded" aria-hidden="true">dark_mode</span>
      </button>

      <div class="lang-popup" role="menu" aria-hidden="true">
        <button class="lang-option" type="button" data-lang="de" data-i18n="ui.lang.de" role="menuitemradio">German</button>
        <button class="lang-option" type="button" data-lang="en" data-i18n="ui.lang.en" role="menuitemradio">English</button>
      </div>
      <div class="unit-popup" role="menu" aria-hidden="true">
        <button class="unit-option" type="button" data-unit="metric" data-i18n="ui.units.metric" role="menuitemradio">Metric (mm)</button>
        <button class="unit-option" type="button" data-unit="imperial_decimal" data-i18n="ui.units.imperial_decimal" role="menuitemradio">Imperial (decimal)</button>
        <button class="unit-option" type="button" data-unit="imperial_fraction" data-i18n="ui.units.imperial_fraction" role="menuitemradio">Imperial (fraction)</button>
      </div>
      <div class="csv-popup" role="menu" aria-hidden="true">
        <button class="csv-option" type="button" data-delim=";" data-i18n="ui.csv.semicolon" role="menuitemradio">Semicolon (;)</button>
        <button class="csv-option" type="button" data-delim="," data-i18n="ui.csv.comma" role="menuitemradio">Comma (,)</button>
        <button class="csv-option" type="button" data-delim="&#9;" data-i18n="ui.csv.tab" role="menuitemradio">TAB</button>
      </div>
    </div>
  </aside>\`;
    }

    /** List of CDN scripts to load in offline report */
    const CDN_SCRIPTS = [
        'https://unpkg.com/tabulator-tables@6.2.1/dist/js/tabulator.min.js',
        'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
        'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    ];

    /** Create progress overlay */
    function showProgressOverlay() {
        let overlay = document.getElementById('avl-offline-progress');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'avl-offline-progress';
            Object.assign(overlay.style, {
                position: 'fixed',
                inset: '0',
                zIndex: '20000',
                background: 'rgba(15, 23, 42, 0.88)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '16px',
                color: '#fff',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            });
            overlay.innerHTML = \`
                <div style="width:48px;height:48px;border:4px solid rgba(255,255,255,0.2);border-top-color:#3b82f6;border-radius:50%;animation:avlSpin 0.8s linear infinite;"></div>
                <div id="avl-offline-msg" style="font-size:1.15rem;font-weight:600;">Generating Offline Report...</div>
                <div id="avl-offline-sub" style="font-size:0.88rem;opacity:0.8;">Extracting styles and building self-contained HTML...</div>
                <style>@keyframes avlSpin { to { transform: rotate(360deg); } }</style>
            \`;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }

    function updateProgressMsg(msg) {
        const el = document.getElementById('avl-offline-msg');
        if (el) el.innerText = msg;
    }

    let isGenerating = false;
    function hideProgressOverlay() {
        isGenerating = false;
        const overlay = document.getElementById('avl-offline-progress');
        if (overlay) overlay.style.display = 'none';
    }

    /** Main Offline Bundle Generation */
    function generateBundle() {
        if (isGenerating) return;
        isGenerating = true;
        showProgressOverlay();

        setTimeout(() => {
            try {
                // 1. Extract CSS
                updateProgressMsg('Extracting CSS styles...');
                const inlinedCSS = getInlinedCSS();

                // 2. Extract Sidebar HTML
                updateProgressMsg('Extracting sidebar layout...');
                const sidebarHTML = getSidebarHTML();

                // 3. Assemble subpage HTML views using pre-extracted subpage templates
                updateProgressMsg('Assembling complete subpage views...');
                const subpageIds = ['overview', 'panels', 'cabinets', 'bigparts', 'laminates', 'cutting', 'programs', 'fittings', 'purchase', 'summary'];
                const viewsHTML = [];

                subpageIds.forEach(id => {
                    let content = INLINED_SUBPAGE_TEMPLATES[id] || '';

                    // If active page has live main-content for overview, capture dynamic overview
                    if (id === 'overview') {
                        const mainEl = document.querySelector('.main-content');
                        if (mainEl && mainEl.innerHTML.trim().length > 100) {
                            content = mainEl.innerHTML;
                        }
                    }
                    if (id === 'overview') {
                        content = content.replace(/<button[^>]*id=["']export-offline-btn["'][\\s\\S]*?<\\/button>/gi, '<div class="offline-header-badge" style="display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 4px; color: #10B981; font-weight: 700; font-size: 0.85rem;"><span class="material-symbols-rounded" style="font-size: 18px;">offline_pin</span><span>Offline Report</span></div>');
                    }

                    viewsHTML.push(\`
                        <section id="view-\${id}" class="report-view" style="display: \${id === 'overview' ? 'flex' : 'none'}; flex-direction: column; height: 100%; padding: 20px; box-sizing: border-box;">
                            \${content}
                        </section>
                    \`);
                });

                // Project filename for title
                let projFile = 'Project';
                if (typeof reportData !== 'undefined' && reportData && reportData.Project) {
                    projFile = reportData.Project.FILENAME || reportData.Project.PRJ_NAME || 'Project';
                }

                // SPA View Switcher script + Tabulator redraw trigger + Sidebar collapse toggle via Event Delegation
                const spaLogicJS = \`
                    window.AVL_OFFLINE_MODE = true;

                    (function() {
                        const views = ['overview', 'panels', 'cabinets', 'bigparts', 'laminates', 'cutting', 'programs', 'fittings', 'purchase', 'summary'];

                        function showView(viewId) {
                            if (!views.includes(viewId)) viewId = 'overview';

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
                                    if (v === viewId) {
                                        if (link) link.classList.add('active');
                                    } else {
                                        if (link) link.classList.remove('active');
                                    }
                                }
                            });

                            window.dispatchEvent(new CustomEvent('avl:viewChanged', { detail: { view: viewId } }));

                            // Safe Redraw for visible tables only (avoids layout loops on hidden sub-tables)
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
                                                    if (cols && cols.length > 0) {
                                                        tbl.setColumns(cols);
                                                    } else {
                                                        tbl.redraw(true);
                                                    }
                                                }
                                            }
                                        });
                                    }
                                } catch(e) { }
                            }
                            requestAnimationFrame(() => {
                                setTimeout(() => safeRedrawView(viewId), 150);
                                setTimeout(() => safeRedrawView(viewId), 500);
                            });
                        }

                        function updateSidebarVisibility() {
                            try {
                                if (typeof reportData === 'undefined' || !reportData || !reportData.Project) return;
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

                                const counts = {
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

                                Object.keys(counts).forEach(key => {
                                    const el = document.querySelector('[data-nav-id="' + key + '"]');
                                    if (el) {
                                        if (counts[key] <= 0) {
                                            el.style.setProperty('display', 'none', 'important');
                                        } else {
                                            el.style.display = '';
                                        }
                                    }
                                });
                            } catch(e) { }
                        }

                        document.addEventListener('DOMContentLoaded', () => {
                            updateSidebarVisibility();
                            // Event delegation for SPA view menu links
                            document.addEventListener('click', function(e) {
                                const link = e.target.closest('.menu-link');
                                if (link) {
                                    e.preventDefault();
                                    let viewId = link.getAttribute('data-view');
                                    if (!viewId) {
                                        const href = link.getAttribute('href') || '';
                                        if (href.includes('panels'))    viewId = 'panels';
                                        else if (href.includes('cabinets'))  viewId = 'cabinets';
                                        else if (href.includes('bigparts'))  viewId = 'bigparts';
                                        else if (href.includes('laminates')) viewId = 'laminates';
                                        else if (href.includes('cutting'))   viewId = 'cutting';
                                        else if (href.includes('programs'))  viewId = 'programs';
                                        else if (href.includes('fittings'))  viewId = 'fittings';
                                        else if (href.includes('purchase'))  viewId = 'purchase';
                                        else if (href.includes('summary'))   viewId = 'summary';
                                        else viewId = 'overview';
                                    }
                                    showView(viewId);
                                }
                            });

                            showView('overview');
                        });
                    })();
                \`;

                // 5. Assemble Master Standalone HTML Document
                updateProgressMsg('Building final single-file HTML...');

                const offlineHTML = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AV-Line | \${projFile} (Offline Report)</title>

  <!-- Google Material Symbols & Fonts -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
  <link href="https://unpkg.com/tabulator-tables@6.2.1/dist/css/tabulator.min.css" rel="stylesheet" />

  <!-- Relative CSS Fallback Links -->
  <link rel="stylesheet" href="https://av-line.github.io/SWOOD_AVL/Report_Test/CSS/avl-report_colors.css" />
  <link rel="stylesheet" href="https://av-line.github.io/SWOOD_AVL/Report_Test/CSS/avl-report_style.css" />
  <link rel="stylesheet" href="https://av-line.github.io/SWOOD_AVL/Report_Test/CSS/avl-report_dashboard.css" />
  <link rel="stylesheet" href="https://av-line.github.io/SWOOD_AVL/Report_Test/CSS/avl-report_pdf-print.css" />

  <!-- Local Project Data (Relative reference — place in report root directory) -->
  <script charset="windows-1252" src="_SOURCE/JS/tabledata.js"></script>

  <!-- External CDN Libraries for offline execution -->
  \${CDN_SCRIPTS.map(s => \`<script src="\${s}"></script>\`).join('\\n  ')}

  <!-- Guaranteed Inlined Master Styles -->
  <style>
    \${inlinedCSS}

    /* SPA View Section styles */
    .report-view {
      width: 100%;
      height: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      overflow: auto;
    }
  </style>
</head>
<body>

  <nav class="site-nav">
    <button class="sidebar-toggle" aria-label="Toggle sidebar" title="Toggle sidebar">
      <span class="material-symbols-rounded">menu</span>
    </button>
  </nav>

  <div class="container">
    <!-- Inlined Direct Sidebar Markup -->
    \${sidebarHTML}

    <!-- Master Single-Page Main Content -->
    <div class="main-content" style="height: 100vh; display: flex; flex-direction: column; overflow: hidden; padding: 20px;">
      \${viewsHTML.join('\\n')}
    </div>
  </div>

  <!-- Print progress overlay (body-level so it's always visible) -->
  <div id="print-overlay"
    style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.7);
           align-items:center;justify-content:center;flex-direction:column;gap:14px;color:#fff;
           font-family:sans-serif;font-size:1.1rem;">
    <span class="material-symbols-rounded" style="font-size:48px;animation:spin 1s linear infinite;">autorenew</span>
    <span id="print-overlay-msg" data-i18n="pdf.loading">Generating PDF Report...</span>
  </div>

  <!-- SPA Navigation Switcher & Sidebar Toggle -->
  <script>
    \${spaLogicJS}
  </script>

  <!-- Inlined 100% Self-Contained JavaScript Engine (All 19 Modules IIFE-isolated) -->
  <script>
    \${INLINED_ENGINE_JS}
  </script>
</body>
</html>\`;

                // 5. Download File
                updateProgressMsg('Downloading file...');
                const blob = new Blob([offlineHTML], { type: 'text/html;charset=utf-8;' });
                const link = document.createElement('a');
                const downloadFileName = \`\${projFile}_Offline_Report.html\`;

                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', downloadFileName);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }

                hideProgressOverlay();
            } catch (err) {
                console.error('Offline Exporter Error:', err);
                alert('Error generating offline report: ' + err.message);
                hideProgressOverlay();
            }
        }, 80);
    }

    // Attach click listener via document click delegation
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.offline-export-btn, #export-offline-btn');
        if (btn) {
            e.preventDefault();
            generateBundle();
        }
    });

    window.generateOfflineReport = generateBundle;
    window.AVL_OFFLINE_EXPORT = { generateBundle };

})();
`;

fs.writeFileSync(path.join(__dirname, 'avl-report_offline-export.js'), exporterCode, 'utf8');
console.log('Successfully updated build-offline-exporter.js with offsetParent visibility guard!');
