// avl-report_laminates-table.js — Laminates page logic
// Depends on: Tabulator, SheetJS, tabledata.js

(function () {

    // ── Cabinet colour palette ────────────────────────────────────────────────────
    const COLORS = [
        'var(--color-cab-0)','var(--color-cab-1)','var(--color-cab-2)','var(--color-cab-3)','var(--color-cab-4)',
        'var(--color-cab-5)','var(--color-cab-6)','var(--color-cab-7)','var(--color-cab-8)','var(--color-cab-9)',
        'var(--color-cab-10)','var(--color-cab-11)','var(--color-cab-12)','var(--color-cab-13)','var(--color-cab-14)'
    ];
    const cabColor = idx => {
        if (idx === null || idx === undefined || idx < 0) return 'var(--color-cab-nocab)';
        return COLORS[idx % COLORS.length];
    };

    function drawGrainSVG(grainVal) {
        let deg = 0;
        if (typeof grainVal === 'string') {
            deg = parseFloat(grainVal.replace(/[^-0-9.]/g, '')) || 0;
        } else if (typeof grainVal === 'number') {
            deg = grainVal;
        }
        deg = ((deg % 360) + 360) % 360;
        let rotation = -deg;
        if (deg === 0 || deg === 360) rotation = 0;
        else if (deg === 90 || deg === 180) rotation = -90;
        
        const s = 18;
        return `<div class="grain-svg-container" style="display:inline-block;width:${s}px;height:${s}px;vertical-align:middle;position:relative;overflow:visible;box-sizing:border-box;">`
            + `<svg width="${s}" height="${s}" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">`
            + `<g transform="rotate(${rotation} 12 12)">`
            + `<line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`
            + `<polyline points="7,8 3,12 7,16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`
            + `<polyline points="17,8 21,12 17,16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`
            + `</g>`
            + `</svg>`
            + `</div>`;
    }

    // ── Selection state ──────────────────────────────────────────────────────────
    const _st = { selected: new Set(), lastClickIdx: -1 };

    // ── Persistence: completed laminates ─────────────────────────────────────────
    const STORAGE_KEY = 'avl_lam_done';
    // Restore from embedded file state (if tabledata.js was downloaded with JSON_STATE="SAVED")
    if (window.AVL_SAVE) window.AVL_SAVE.restoreAll();
    function loadDone() {
        try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
        catch (e) { return new Set(); }
    }
    function saveDone(set) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch (e) { }
    }
    const doneSet = loadDone();


    // ── Flatten laminates ─────────────────────────────────────────────────────────
    const getArray = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'object') return [v];
        return [];
    };
    const flatLaminates = [];

    if (typeof reportData !== 'undefined' && reportData.Project && reportData.Project.INTERNALPRODUCTION) {
        const proj = reportData.Project;

        // Build SNR_CAB → { cabIdx, cab } lookup
        const cabBySNR = {};
        const cabinets = getArray(proj.CABINET);
        if (cabinets.length > 0) {
            const sortedCabs = [...cabinets];
            // Sort cabinets by SNR_CAB for consistent color indexing
            sortedCabs.sort((a, b) => {
                const valA = a.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (a.SNR_CAB || 'No CAB');
                const valB = b.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (b.SNR_CAB || 'No CAB');
                return String(valA).localeCompare(String(valB), undefined, { numeric: true });
            });
            sortedCabs.forEach((cab, cabIdx) => { if (cab.SNR_CAB) cabBySNR[cab.SNR_CAB] = { cabIdx, cab }; });
        }

        // Small part lookup to exclude them from laminates
        const smallPartSet = new Set();
        getArray(proj.SMALLPART).forEach(sp => {
            if (sp.FILENAME) smallPartSet.add(sp.FILENAME);
        });

        const parts = getArray(proj.INTERNALPRODUCTION);
        parts.forEach(part => {
            // Exclude small parts
            if (smallPartSet.has(part.FILENAME)) return;
            
            // Only include parts that have at least one laminate reference
            if (!part.PAN_LAMTOP_MATREF && !part.PAN_LAMBOT_MATREF) return;

            const snr = part.SNR_CAB || '';
            const cabInfo = snr ? cabBySNR[snr] : null;
            const cabIdx  = cabInfo ? cabInfo.cabIdx : -1;
            const cab     = cabInfo ? cabInfo.cab    : null;
            if (!cabInfo) part.SNR_CAB = "No CAB";

            const uid = `lam__${part.FILENAME}`;

            flatLaminates.push({
                _uid: uid,
                _cabIdx: cabIdx,
                _cabDesc: cab ? (cab.DESCRIPTION_CAB || '') : '',
                _partData: part,

                SNR_CAB: part.SNR_CAB || '—',
                SNR_CABList: part.SNR_CABList || '—',
                DESCRIPTION: part.DESCRIPTION || '—',
                FILENAME: part.FILENAME || '—',
                QTY: part.QTY || '1',
                IMG: part.IMG || '',

                // Laminate Data
                LAM_TOP_MAT: part.PAN_LAMTOP_MATREF || '—',
                LAM_BOT_MAT: part.PAN_LAMBOT_MATREF || '—',
                LAM_TOP_L: part.PAN_LAMTOP_ST_L || '—',
                LAM_TOP_W: part.PAN_LAMTOP_ST_W || '—',
                LAM_BOT_L: part.PAN_LAMBOT_ST_L || '—',
                LAM_BOT_W: part.PAN_LAMBOT_ST_W || '—',
                
                // Grain direction (mapped dynamically from PAN_LAMxxx_ST_ANGLEINPANEL)
                LAM_TOP_GRAIN: (part.PAN_LAMTOP_ST_ANGLEINPANEL !== undefined && part.PAN_LAMTOP_ST_ANGLEINPANEL !== '') ? `${parseFloat(part.PAN_LAMTOP_ST_ANGLEINPANEL)} Grad` : '0 Grad',
                LAM_BOT_GRAIN: (part.PAN_LAMBOT_ST_ANGLEINPANEL !== undefined && part.PAN_LAMBOT_ST_ANGLEINPANEL !== '') ? `${parseFloat(part.PAN_LAMBOT_ST_ANGLEINPANEL)} Grad` : '0 Grad',

                // Substrate Data
                SUBSTRATE_MAT: part.PAN_MATREF || '—',
                SUBSTRATE_RAW: `${part.PAN_STL || '—'} x ${part.PAN_STW || '—'}`,
                
                // Calibration: (PAN_MAT_T + PAN_LAMTOP_ST_T + PAN_LAMBOT_ST_T) - PAN_TWL
                CALIB_VAL: (parseFloat(part.PAN_MAT_T || 0) + parseFloat(part.PAN_LAMTOP_ST_T || 0) + parseFloat(part.PAN_LAMBOT_ST_T || 0) - parseFloat(part.PAN_TWL || 0)).toFixed(2),
                CALIB_THICK: part.PAN_TWOL || '—',
                
                // Finish Dim: LWEB x WWEB x TWL
                FINISH_DIM: `${part.PAN_LWEB || '—'} x ${part.PAN_WWEB || '—'} x ${part.PAN_TWL || '—'}`,
                
                COMMENT: part.COMMENT || '',

                // For grouping/searching
                LAM_MAT_SUMMARY: [part.PAN_LAMTOP_MATREF, part.PAN_LAMBOT_MATREF].filter(Boolean).join(', '),
                
                done: doneSet.has(uid)
            });
        });

        // Include laminated BigParts
        getArray(proj.BIGPART).forEach(bp => {
            if (!bp.BP_LAMTOP && !bp.BP_LAMBOT) return;
            
            const uid = `lam__${bp.FILENAME}`;
            
            let snr = 'BigPart';
            // Attempt to find SNR_CAB from BIGPART_ASSEMBLY if it exists
            getArray(proj.BIGPART_ASSEMBLY).forEach(bpa => {
                if (bpa.BPINDEX === bp.BPINDEX && bpa.SNR_CAB) {
                    snr = bpa.SNR_CAB;
                }
            });
            const cabInfo = snr !== 'BigPart' ? cabBySNR[snr] : null;
            const cabIdx  = cabInfo ? cabInfo.cabIdx : -1;
            const cab     = cabInfo ? cabInfo.cab    : null;

            flatLaminates.push({
                _uid: uid,
                _cabIdx: cabIdx,
                _cabDesc: cab ? (cab.DESCRIPTION_CAB || '') : '',
                _partData: bp,

                SNR_CAB: snr,
                SNR_CABList: '—',
                DESCRIPTION: bp.DESCRIPTION || '—',
                FILENAME: bp.FILENAME || '—',
                QTY: bp.QUANTITY || '1',
                IMG: '',

                // Laminate Data
                LAM_TOP_MAT: bp.BP_LAMTOP || '—',
                LAM_BOT_MAT: bp.BP_LAMBOT || '—',
                LAM_TOP_L: bp.BP_L || '—',
                LAM_TOP_W: bp.BP_W || '—',
                LAM_BOT_L: bp.BP_L || '—',
                                LAM_BOT_W: bp.BP_W || '—',
                
                LAM_TOP_GRAIN: (bp.BP_LAMTOP_ST_DFIL !== undefined && bp.BP_LAMTOP_ST_DFIL !== '') ? `${parseFloat(bp.BP_LAMTOP_ST_DFIL)} Grad` : ((bp.BP_LAMTOP_GRAIN !== undefined && bp.BP_LAMTOP_GRAIN !== '') ? `${parseFloat(bp.BP_LAMTOP_GRAIN)} Grad` : '0 Grad'),
                LAM_BOT_GRAIN: (bp.BP_LAMBOT_ST_DFIL !== undefined && bp.BP_LAMBOT_ST_DFIL !== '') ? `${parseFloat(bp.BP_LAMBOT_ST_DFIL)} Grad` : ((bp.BP_LAMBOT_GRAIN !== undefined && bp.BP_LAMBOT_GRAIN !== '') ? `${parseFloat(bp.BP_LAMBOT_GRAIN)} Grad` : '0 Grad'),

                SUBSTRATE_MAT: bp.BP_MATREF || '—',
                SUBSTRATE_RAW: `— x —`,
                
                CALIB_VAL: '—',
                CALIB_THICK: '—',
                
                FINISH_DIM: `${bp.BP_L || '—'} x ${bp.BP_W || '—'} x ${bp.BP_T || '—'}`,
                
                COMMENT: bp.COMMENT || '',

                LAM_MAT_SUMMARY: [bp.BP_LAMTOP, bp.BP_LAMBOT].filter(Boolean).join(', '),
                
                done: doneSet.has(uid)
            });
        });
    }

    // ── Tabulator reference ───────────────────────────────────────────────────────
    let tableRef = null;

    // ── Columns ───────────────────────────────────────────────────────────────────
    function getColumns() {
        let w = {};
        const tableContainer = document.getElementById("data-table");
        if (tableContainer && tableContainer.dataset.colWidths) {
            try { w = JSON.parse(tableContainer.dataset.colWidths); } catch (e) {}
        }

        const t = (...args) => window.AVL_LANG ? window.AVL_LANG.t(...args) : args[0];
        
        return [
            // ── Checkbox ──────────────────────────────────────────────────────
            {
                title: '',
                field: 'done',
                width: 38,
                minWidth: 38,
                hozAlign: 'center',
                vertAlign: 'middle',
                headerSort: false,
                cssClass: 'lam-check-cell',
                formatter: function (cell) {
                    const checked = cell.getValue() ? 'checked' : '';
                    return `<input type="checkbox" class="lam-check" ${checked} />`;
                },
                cellClick: function (e, cell) {
                    const cb = e.target.closest('.lam-check') || (e.target.classList.contains('lam-check') ? e.target : null);
                    if (!cb) return;
                    e.stopPropagation();
                    const row = cell.getRow();
                    const uid = row.getData()._uid;
                    const isDone = !row.getData().done;

                    const targets = (_st.selected.has(uid) && _st.selected.size > 1)
                        ? [..._st.selected]
                        : [uid];

                    targets.forEach(tid => {
                        const lam = flatLaminates.find(p => p._uid === tid);
                        if (!lam) return;
                        lam.done = isDone;
                        if (isDone) doneSet.add(tid);
                        else doneSet.delete(tid);
                        
                        const tRow = tableRef?.getRows('active').find(r => r.getData()._uid === tid);
                        if (tRow) applyRowClass(tRow, isDone);
                        const rowCb = tRow?.getElement()?.querySelector('.lam-check');
                        if (rowCb) rowCb.checked = isDone;
                    });

                    saveDone(doneSet);
                    _st.selected.clear();
                    updateSelectionBar();
                },
                accessorDownload: v => v ? '✓' : ''
            },

            // ── SNR CAB ────────────────────────────────────────────────────────
            {
                title: t('th.cabsnr'),
                field: 'SNR_CAB',
                sorter: 'alphanum',
                width: w["SNR_CAB"] || 70,
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    const col = cabColor(d._cabIdx);
                    return `<span style="display:inline-flex;align-items:center;gap:5px;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${col};flex-shrink:0;"></span>
                        <span>${d.SNR_CAB}</span>
                    </span>`;
                }
            },

            // ── SNR CABList ────────────────────────────────────────────────────
            {
                title: t('th.cablist'),
                field: 'SNR_CABList',
                sorter: 'alphanum',
                width: w["SNR_CABList"] || 70
            },

            // ── Description & Filename ─────────────────────────────────────────
            {
                title: t('th.desc'),
                field: 'DESCRIPTION',
                width: w["DESCRIPTION"] || undefined,
                minWidth: 150,
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    return `<div style="font-weight:600;">${d.DESCRIPTION}</div>
                            <div style="font-size:0.82em;color:var(--color-text-placeholder);">${d.FILENAME}</div>`;
                }
            },

            // ── Qty ──────────────────────────────────────────────────────────
            {
                title: t('th.quantity'),
                field: 'QTY',
                width: w["QTY"] || 60,
                hozAlign: 'center'
            },



            // ── Location & Material ────────────────────────────────────────────
            {
                title: t('th.lammaterial'),
                field: 'LAM_MAT_SUMMARY',
                width: w["LAM_MAT"] || 200,
                cssClass: 'lam-dual-cell',
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    const topLabel = window.AVL_LANG ? t('ui.lam.o') : 'Top';
                    const botLabel = window.AVL_LANG ? t('ui.lam.u') : 'Bottom';
                    return `
                        <div class="lam-top-row"><span class="lam-label">${topLabel}</span> ${d.LAM_TOP_MAT}</div>
                        <div class="lam-bot-row"><span class="lam-label">${botLabel}</span> ${d.LAM_BOT_MAT}</div>
                    `;
                }
            },

            // ── Length ─────────────────────────────────────────────────────────
            {
                title: t('th.lamlength'),
                field: 'LAM_TOP_L',
                width: w["LAM_L"] || 90,
                hozAlign: 'right',
                cssClass: 'lam-dual-cell',
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    const topL = (window.AVL_UNITS && d.LAM_TOP_L && d.LAM_TOP_L !== '-') ? window.AVL_UNITS.formatDim(d.LAM_TOP_L) : d.LAM_TOP_L;
                    const botL = (window.AVL_UNITS && d.LAM_BOT_L && d.LAM_BOT_L !== '-') ? window.AVL_UNITS.formatDim(d.LAM_BOT_L) : d.LAM_BOT_L;
                    return `
                        <div class="lam-top-row">${topL}</div>
                        <div class="lam-bot-row">${botL}</div>
                    `;
                }
            },

            // ── Width ──────────────────────────────────────────────────────────
            {
                title: t('th.lamwidth'),
                field: 'LAM_TOP_W',
                width: w["LAM_W"] || 90,
                hozAlign: 'right',
                cssClass: 'lam-dual-cell',
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    const topW = (window.AVL_UNITS && d.LAM_TOP_W && d.LAM_TOP_W !== '-') ? window.AVL_UNITS.formatDim(d.LAM_TOP_W) : d.LAM_TOP_W;
                    const botW = (window.AVL_UNITS && d.LAM_BOT_W && d.LAM_BOT_W !== '-') ? window.AVL_UNITS.formatDim(d.LAM_BOT_W) : d.LAM_BOT_W;
                    return `
                        <div class="lam-top-row">${topW}</div>
                        <div class="lam-bot-row">${botW}</div>
                    `;
                }
            },

            // ── Grain ──────────────────────────────────────────────────────────
            {
                title: t('th.lamgrain'),
                field: 'LAM_TOP_GRAIN',
                width: w["LAM_GRAIN"] || 110,
                hozAlign: 'center',
                cssClass: 'lam-dual-cell',
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    const topSvg = drawGrainSVG(d.LAM_TOP_GRAIN);
                    const botSvg = drawGrainSVG(d.LAM_BOT_GRAIN);
                    return `
                        <div class="lam-top-row" style="display:flex;align-items:center;justify-content:center;">
                            ${topSvg}
                        </div>
                        <div class="lam-bot-row" style="display:flex;align-items:center;justify-content:center;margin-top:4px;">
                            ${botSvg}
                        </div>
                    `;
                }
            },

            // ── Substrate Material ─────────────────────────────────────────────
            {
                title: t('th.substratemat'),
                field: 'SUBSTRATE_MAT',
                width: w["SUBSTRATE_MAT"] || 120
            },

            // ── Substrate Raw Dims ─────────────────────────────────────────────
            {
                title: t('th.substrateraw'),
                field: 'SUBSTRATE_RAW',
                width: w["SUBSTRATE_RAW"] || 150,
                hozAlign: 'center',
                formatter: function (cell) {
                    const data = cell.getRow().getData();
                    const p = data._partData || {};
                    const stl = p.PAN_STL;
                    const stw = p.PAN_STW;
                    if (!stl || !stw || stl === '—' || stw === '—') return cell.getValue() || '—';
                    const fmt = (v) => (window.AVL_UNITS ? window.AVL_UNITS.formatDim(v) : v);
                    return `${fmt(stl)} × ${fmt(stw)}`;
                }
            },

            // ── Calibration ────────────────────────────────────────────────────
            {
                title: t('th.calibrate'),
                field: 'CALIB_VAL',
                width: w["CALIB"] || 100,
                hozAlign: 'center',
                formatter: function (cell) {
                    const val = cell.getValue();
                    if (!val || val === '—') return '—';
                    return window.AVL_UNITS ? window.AVL_UNITS.formatDim(val) : val;
                }
            },


            // ── Finish Dim ─────────────────────────────────────────────────────
            {
                title: t('th.finishdim'),
                field: 'FINISH_DIM',
                width: w["FINISH_DIM"] || 150,
                hozAlign: 'center',
                formatter: function (cell) {
                    const data = cell.getRow().getData();
                    const p = data._partData || {};
                    const l = p.PAN_LWEB || p.BP_L;
                    const w = p.PAN_WWEB || p.BP_W;
                    const t = p.PAN_TWL || p.BP_T;
                    if (!l || !w) return cell.getValue() || '—';
                    const fmt = (v) => (window.AVL_UNITS ? window.AVL_UNITS.formatDim(v) : v);
                    if (t) return `${fmt(l)} × ${fmt(w)} × ${fmt(t)}`;
                    return `${fmt(l)} × ${fmt(w)}`;
                }
            },

            // ── Comment ────────────────────────────────────────────────────────
            {
                title: t('th.comment'),
                field: 'COMMENT',
                width: w["COMMENT"] || undefined,
                minWidth: 100,
                formatter: function (cell) {
                    const v = cell.getValue();
                    return v ? `<span style="font-style:italic;font-size:0.88em;">${v}</span>` : '';
                }
            }
        ];
    }

    // ── Row class (done / selected) ───────────────────────────────────────────────
    function applyRowClass(row, isDone) {
        const el = row.getElement();
        if (!el) return;
        if (isDone) el.classList.add('lam-done');
        else el.classList.remove('lam-done');
    }

    function applySelectionClass(row, isSelected) {
        const el = row.getElement();
        if (!el) return;
        if (isSelected) el.classList.add('lam-selected');
        else el.classList.remove('lam-selected');
    }

    // ── Selection bar update ──────────────────────────────────────────────────────
    function updateSelectionBar() {
        const n = _st.selected.size;
        const bar = document.getElementById('lam-sel-bar');
        const txt = document.getElementById('lam-sel-text');
        if (bar) bar.style.display = n > 1 ? '' : 'none';
        if (txt) txt.textContent = window.AVL_LANG ? window.AVL_LANG.t('cut.list.selected', { n }) : `${n} selected`;

        if (!tableRef) return;
        tableRef.getRows('active').forEach(row => {
            applySelectionClass(row, _st.selected.has(row.getData()._uid));
        });
    }

    function initLaminatesTable() {
        const viewSec = document.getElementById('view-laminates') || document;
        const tableEl = viewSec.querySelector('#data-table') || document.getElementById('laminates-table');
        if (!tableEl) return;
        if (tableEl.classList.contains('tabulator') && tableEl.children.length > 0) return;

        if (typeof reportData === 'undefined') {
            tableEl.innerHTML =
                "<p style='color:red;padding:20px'><strong>Error:</strong> tabledata.js not loaded.</p>";
            return;
        }

        tableRef = new Tabulator(tableEl, {
            data: flatLaminates,
            layout: 'fitColumns',
            height: '100%',
            initialSort: [
                { column: "SNR_CABList", dir: "asc" },
                { column: "SNR_CAB", dir: "asc" }
            ],
            columnDefaults: { tooltip: true },
            columns: getColumns(),
            rowFormatter: function (row) {
                if (row.getData().done) applyRowClass(row, true);
            }
        });

        // Re-apply classes after any render
        tableRef.on('renderComplete', function () {
            tableRef.getRows().forEach(row => {
                if (row.getData().done) applyRowClass(row, true);
                if (_st.selected.has(row.getData()._uid)) applySelectionClass(row, true);
            });
        });

        // Row click selection logic
        tableRef.on('rowClick', function (e, row) {
            if (e.target.closest('.lam-check-cell')) return;

            e.preventDefault();
            window.getSelection()?.removeAllRanges();

            const allRows = tableRef.getRows('active');
            const idx = allRows.indexOf(row);
            const uid = row.getData()._uid;

            if (e.shiftKey && _st.lastClickIdx >= 0) {
                const lo = Math.min(_st.lastClickIdx, idx);
                const hi = Math.max(_st.lastClickIdx, idx);
                _st.selected.clear();
                for (let i = lo; i <= hi; i++) {
                    if (allRows[i]) _st.selected.add(allRows[i].getData()._uid);
                }
            } else if (e.ctrlKey || e.metaKey) {
                if (_st.selected.has(uid)) _st.selected.delete(uid);
                else _st.selected.add(uid);
                _st.lastClickIdx = idx;
            } else {
                if (_st.selected.has(uid)) {
                    _st.selected.delete(uid);
                } else {
                    _st.selected.clear();
                    _st.selected.add(uid);
                }
                _st.lastClickIdx = idx;
            }
            updateSelectionBar();
        });

        // "Mark done" button
        document.getElementById('lam-mark-done')?.addEventListener('click', () => {
            const targets = [..._st.selected];
            targets.forEach(tid => {
                const lam = flatLaminates.find(p => p._uid === tid);
                if (!lam) return;
                lam.done = true;
                doneSet.add(tid);
                const tRow = tableRef.getRows('active').find(r => r.getData()._uid === tid);
                if (tRow) {
                    applyRowClass(tRow, true);
                    const cb = tRow.getElement()?.querySelector('.lam-check');
                    if (cb) cb.checked = true;
                }
            });
            saveDone(doneSet);
            _st.selected.clear();
            updateSelectionBar();
        });

        // Item counter
        function updateCount() {
            const el = viewSec.querySelector('#item-count-display') || document.getElementById('item-count-display');
            if (!el) return;
            const n = tableRef.getData('active').length;
            el.innerHTML = window.AVL_LANG
                ? window.AVL_LANG.t('ui.totalitems', { count: n })
                : `Total: ${n} Items`;
        }

        // Lang reload
        window.addEventListener('avl:langChanged', () => {
            tableRef.setColumns(getColumns());
            updateCount();
        });
        tableRef.on('tableBuilt', updateCount);
        tableRef.on('dataLoaded', updateCount);
        tableRef.on('dataFiltered', updateCount);

        // Search
        const searchInput = viewSec.querySelector('#global-search') || document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('input', function (e) {
                const val = e.target.value.toLowerCase();
                tableRef.setFilter(function (data) {
                    return ['SNR_CAB', 'SNR_CABList', 'DESCRIPTION', 'FILENAME',
                        'LAM_TOP_MAT', 'LAM_BOT_MAT', 'SUBSTRATE_MAT', 'COMMENT']
                        .some(k => String(data[k] || '').toLowerCase().includes(val));
                });
            });
        }

        // Group By
        const groupBySelect = viewSec.querySelector('#group-by') || document.getElementById('group-by');
        if (groupBySelect) {
            groupBySelect.addEventListener('change', e => tableRef.setGroupBy(e.target.value));
        }

        // Export dropdown
        const exportBtn = viewSec.querySelector('#export-btn') || document.getElementById('export-btn');
        const exportMenu = viewSec.querySelector('#export-menu') || document.getElementById('export-menu');
        const exportCsv = viewSec.querySelector('#export-csv') || document.getElementById('export-csv');
        const exportXlsx = viewSec.querySelector('#export-xlsx') || document.getElementById('export-xlsx');

        if (exportBtn && exportMenu) {
            exportBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                exportMenu.classList.toggle('show');
                exportBtn.classList.toggle('active');
            });

            if (exportCsv) {
                exportCsv.addEventListener('click', () =>
                    tableRef.download('csv', 'Laminates.csv', { delimiter: window.AVL_CSV ? window.AVL_CSV.getDelimiter() : ';' }));
            }
            if (exportXlsx) {
                exportXlsx.addEventListener('click', () =>
                    tableRef.download('xlsx', 'Laminates.xlsx', { sheetName: 'Laminates' }));
            }
        }

        // Footer
        if (reportData && reportData.Project) {
            const prj = reportData.Project;
            const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
            setEl('foot-cus', prj.CUS_NAME);
            setEl('foot-projnr', prj.PRJ_NR);
            setEl('foot-eng', prj.ENGINEER);
            setEl('foot-projname', prj.PRJ_NAME);
        }

    } // initLaminatesTable
    window.initLaminatesTable = initLaminatesTable;
    document.addEventListener('DOMContentLoaded', initLaminatesTable);
    window.addEventListener('avl:viewChanged', function(e) {
        if (e.detail && e.detail.view === 'laminates') initLaminatesTable();
    });

    // ── Helpers ───────────────────────────────────────────────────────────────────
    function toggleDropdown(btnId, menuId) {
        document.getElementById(btnId)?.addEventListener('click', function (e) {
            e.stopPropagation();
            const menu = document.getElementById(menuId);
            const btn  = document.getElementById(btnId);
            if (!menu) return;
            const isOpen = menu.classList.contains('show');
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
            document.querySelectorAll('.icon-action-btn').forEach(b => b.classList.remove('active'));
            if (!isOpen) { menu.classList.add('show'); btn.classList.add('active'); }
        });
    }
    function closeDropdown(menuId, btnId) {
        document.getElementById(menuId)?.classList.remove('show');
        document.getElementById(btnId)?.classList.remove('active');
    }

    window.addEventListener('avl:unitChanged', function() {
        if (typeof tableRef !== 'undefined' && tableRef && typeof getColumns === 'function') {
            tableRef.setColumns(getColumns());
        }
    });

})();
