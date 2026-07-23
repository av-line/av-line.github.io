// avl-report_programs-table.js — CNC Programs page logic
// Mirrors cutting.js selection pattern exactly.
// Depends on: Tabulator, SheetJS, jsPDF, html2canvas, qrcode.min.js, labels.js, tabledata.js

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

    // ── Selection state (mirrors cutting.js _st) ─────────────────────────────────
    const _st = { selected: new Set(), lastClickIdx: -1 };

    // ── Persistence: completed programs ──────────────────────────────────────────
    const STORAGE_KEY = 'avl_prog_done';
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


    const getArray = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'object') return [v];
        return [];
    };
    const flatPrograms = [];

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

        const parts = getArray(proj.INTERNALPRODUCTION);
        parts.forEach(part => {
            const programs = getArray(part.PROGRAMS);
            programs.forEach(prog => {
                if (!prog.PROG_FILENAME || !prog.PROG_FILENAME.trim()) return;

                const snr = part.SNR_CAB || '';
                const cabInfo = snr ? cabBySNR[snr] : null;
                const cabIdx  = cabInfo ? cabInfo.cabIdx : -1;
                const cab     = cabInfo ? cabInfo.cab    : null;
                if (!cabInfo) part.SNR_CAB = "No CAB";

                const uid = `${part.FILENAME}__${prog.PROG_FILENAME}`;

                // Tools by number, spindles by number
                const tools = getArray(prog.TOOLS);
                const spindles = getArray(prog.SPINDLES);
                const toolStrs = [
                    ...tools.map(t => t.TOOL_NUMBER ? `T${t.TOOL_NUMBER}` : '').filter(Boolean),
                    ...spindles.map(s => s.SPINDLE_NUMBER ? `S${s.SPINDLE_NUMBER}` : '').filter(Boolean)
                ];

                flatPrograms.push({
                    _uid: uid,
                    _cabIdx: cabIdx,
                    _cabDesc: cab ? (cab.DESCRIPTION_CAB || '') : '',
                    _partData: part,

                    SNR_CAB: part.SNR_CAB || '—',
                    SNR_CABList: part.SNR_CABList || '—',
                    DESCRIPTION: part.DESCRIPTION || '—',
                    FILENAME: part.FILENAME || '—',
                    PAN_MATREF: part.PAN_MATREF || '—',
                    PAN_LWEB: part.PAN_LWEB || '—',
                    PAN_WWEB: part.PAN_WWEB || '—',
                    LABEL_IMG_BASE64: part.LABEL_IMG_BASE64 || null,

                    PROG_FILENAME: prog.PROG_FILENAME || '—',
                    PROG_PHASENAME: prog.PROG_PHASENAME || '—',
                    PROG_COMMENT: prog.PROG_COMMENT || '',
                    PROG_TIME: prog.PROG_TIME != null ? prog.PROG_TIME : '—',
                    TOOLS_STR: toolStrs.join(', ') || '—',

                    done: doneSet.has(uid)
                });
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
        
        const t = (key) => window.AVL_LANG ? window.AVL_LANG.t(key) : key;

        return [
            // ── Completion checkbox ─────────────────────────────────────────────
            {
                title: '',
                field: 'done',
                width: 38,
                minWidth: 38,
                hozAlign: 'center',
                vertAlign: 'middle',
                headerSort: false,
                cssClass: 'prog-check-cell',
                formatter: function (cell) {
                    const checked = cell.getValue() ? 'checked' : '';
                    return `<input type="checkbox" class="prog-check" ${checked} />`;
                },
                // Checkbox change — mirrors cut-cb change listener in cutting.js
                cellClick: function (e, cell) {
                    const cb = e.target.closest('.prog-check') || (e.target.classList.contains('prog-check') ? e.target : null);
                    if (!cb) return;
                    e.stopPropagation(); // do not bubble to row click
                    const row = cell.getRow();
                    const uid = row.getData()._uid;
                    const isDone = !row.getData().done; // toggle

                    // If this row is in the selection AND there are multiple selected,
                    // apply to all selected — mirrors cutting.js lines 335-346
                    const targets = (_st.selected.has(uid) && _st.selected.size > 1)
                        ? [..._st.selected]
                        : [uid];

                    targets.forEach(tid => {
                        // find the matching program
                        const prog = flatPrograms.find(p => p._uid === tid);
                        if (!prog) return;
                        prog.done = isDone;
                        if (isDone) doneSet.add(tid);
                        else doneSet.delete(tid);
                        // find and style the Tabulator row
                        const tRow = tableRef?.getRows('active').find(r => r.getData()._uid === tid);
                        if (tRow) applyRowClass(tRow, isDone);
                        const rowCb = tRow?.getElement()?.querySelector('.prog-check');
                        if (rowCb) rowCb.checked = isDone;
                    });

                    saveDone(doneSet);
                    _st.selected.clear();
                    updateSelectionBar();
                },
                accessorDownload: v => v ? '✓' : ''
            },

            // ── SNR ────────────────────────────────────────────────────────────
            {
                title: t('th.cabsnr'),
                field: 'SNR_CAB',
                sorter: 'alphanum',
                width: w["SNR_CAB"] || 65,
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    const col = cabColor(d._cabIdx);
                    return `<span style="display:inline-flex;align-items:center;gap:5px;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${col};flex-shrink:0;"></span>
                        <span>${d.SNR_CAB}</span>
                    </span>`;
                }
            },
            {
                title: t('th.cablist'),
                field: 'SNR_CABList',
                sorter: 'alphanum',
                width: w["SNR_CABList"] || 55
            },

            // ── Description ────────────────────────────────────────────────────
            {
                title: t('th.desc'),
                field: 'DESCRIPTION',
                width: w["DESCRIPTION"] || undefined,
                minWidth: 100,
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    return `<span style="font-weight:600;">${d.DESCRIPTION}</span>
                            <div style="margin-top:3px;font-size:0.82em;color:var(--color-text-placeholder);">${d.FILENAME}</div>`;
                }
            },

            // ── Material ───────────────────────────────────────────────────────
            {
                title: t('th.matref'),
                field: 'PAN_MATREF',
                width: w["PAN_MATREF"] || 120
            },

            // ── L×B ───────────────────────────────────────────────────────────
            {
                title: window.AVL_LANG ? window.AVL_LANG.t('th.lxb') : 'L×B',
                field: 'PAN_LWEB',
                width: w["PAN_LWEB"] || 115,
                hozAlign: 'center',
                sorter: 'number',
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    return `${d.PAN_LWEB} × ${d.PAN_WWEB}`;
                }
            },

            // ── Phase ──────────────────────────────────────────────────────────
            {
                title: window.AVL_LANG ? window.AVL_LANG.t('th.phase') : 'Phase',
                field: 'PROG_PHASENAME',
                width: w["PROG_PHASENAME"] || 54,
                hozAlign: 'center'
            },

            // ── QR Code ── generated the same way as in labels.js ──────────────
            {
                title: window.AVL_LANG ? window.AVL_LANG.t('th.qr') : 'QR',
                field: 'PROG_FILENAME',
                width: 60,
                hozAlign: 'center',
                vertAlign: 'middle',
                headerSort: false,
                cssClass: 'prog-qr-cell',
                // Render a placeholder div; the QR is injected after the cell is in the DOM
                formatter: function (cell) {
                    const d = cell.getRow().getData();
                    const val = d.PROG_FILENAME;
                    if (!val || val === '—') return '<span style="opacity:0.25;">—</span>';
                    const uid = 'qr_' + d._uid.replace(/[^a-zA-Z0-9]/g, '_');
                    // Use setTimeout so the div is in the live DOM before QRCode runs
                    setTimeout(() => {
                        if (typeof QRCode === 'undefined') return;
                        const el = document.getElementById(uid);
                        if (!el || el.dataset.qrDone) return;
                        el.dataset.qrDone = '1';
                        el.innerHTML = '';
                        try {
                            new QRCode(el, {
                                text: val, width: 52, height: 52,
                                correctLevel: QRCode.CorrectLevel.M
                            });
                        } catch (e) { el.textContent = 'QR?'; }
                    }, 0);
                    return `<div id="${uid}" class="prog-qr-mini"></div>`;
                },
                accessorDownload: v => v
            },

            // ── CNC Program filename ───────────────────────────────────────────
            {
                title: window.AVL_LANG ? window.AVL_LANG.t('th.cncprogram') : 'CNC Program',
                field: 'PROG_FILENAME',
                width: w["PROG_FILENAME"] || undefined,
                minWidth: 150,
                formatter: function (cell) {
                    const v = cell.getValue();
                    if (!v || v === '—') return '<span style="opacity:0.3;">—</span>';
                    return v;
                }
            },

            // ── Tools / Spindles (by number) ───────────────────────────────────
            {
                title: window.AVL_LANG ? window.AVL_LANG.t('th.tools') : 'Tools',
                field: 'TOOLS_STR',
                width: w["TOOLS_STR"] || undefined,
                minWidth: 100,
                formatter: function (cell) {
                    const val = cell.getValue();
                    if (!val || val === '—') return `<span style="opacity:0.3;">—</span>`;
                    return val;
                },
                tooltip: true
            },

            // ── Comment ───────────────────────────────────────────────────────
            {
                title: t('th.comment'),
                field: 'PROG_COMMENT',
                width: w["PROG_COMMENT"] || undefined,
                minWidth: 90,
                formatter: function (cell) {
                    const val = cell.getValue();
                    if (!val || !val.trim()) return `<span style="opacity:0.25;">—</span>`;
                    return `<span style="font-style:italic;font-size:0.88em;">${val.trim()}</span>`;
                }
            },

            // ── Time ──────────────────────────────────────────────────────────
            {
                title: window.AVL_LANG ? window.AVL_LANG.t('th.time') : 'Time (s)',
                field: 'PROG_TIME',
                width: w["PROG_TIME"] || 68,
                hozAlign: 'center',
                sorter: 'number'
            },

        ];
    }

    // ── Row class (done / selected) ───────────────────────────────────────────────
    function applyRowClass(row, isDone) {
        const el = row.getElement();
        if (!el) return;
        if (isDone) el.classList.add('prog-done');
        else el.classList.remove('prog-done');
    }

    function applySelectionClass(row, isSelected) {
        const el = row.getElement();
        if (!el) return;
        if (isSelected) el.classList.add('prog-selected');
        else el.classList.remove('prog-selected');
    }

    // ── Selection bar update ──────────────────────────────────────────────────────
    function updateSelectionBar() {
        const n = _st.selected.size;
        const bar = document.getElementById('prog-sel-bar');
        const txt = document.getElementById('prog-sel-text');
        if (bar) bar.style.display = n > 1 ? '' : 'none';
        if (txt) txt.textContent = `${n} selected`;

        // Update visual state on all rows
        if (!tableRef) return;
        tableRef.getRows('active').forEach(row => {
            applySelectionClass(row, _st.selected.has(row.getData()._uid));
        });
    }

    function initProgramsTable() {
        const viewSec = document.getElementById('view-programs') || document;
        const tableEl = viewSec.querySelector('#programs-table') || viewSec.querySelector('#data-table') || document.getElementById('programs-table');
        if (!tableEl) return;
        if (tableEl.classList.contains('tabulator') && tableEl.children.length > 0) return;

        if (typeof reportData === 'undefined') {
            tableEl.innerHTML =
                "<p style='color:red;padding:20px'><strong>Error:</strong> tabledata.js not loaded.</p>";
            return;
        }

        tableRef = new Tabulator(tableEl, {
            data: flatPrograms,
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

        // ── Row click: Shift / Ctrl / normal — mirrors cutting.js lines 297-328
        tableRef.on('rowClick', function (e, row) {
            // Ignore clicks on checkbox or print button cells
            if (e.target.closest('.prog-check-cell') || e.target.closest('.prog-print-cell')) return;

            e.preventDefault();
            window.getSelection()?.removeAllRanges();

            const allRows = tableRef.getRows('active');
            const idx = allRows.indexOf(row);
            const uid = row.getData()._uid;

            if (e.shiftKey && _st.lastClickIdx >= 0) {
                // Range select from anchor to current — anchor stays fixed
                const lo = Math.min(_st.lastClickIdx, idx);
                const hi = Math.max(_st.lastClickIdx, idx);
                _st.selected.clear();
                for (let i = lo; i <= hi; i++) {
                    if (allRows[i]) _st.selected.add(allRows[i].getData()._uid);
                }
                // Do NOT update lastClickIdx
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

        // ── "Mark done" button in the selection bar ────────────────────────────
        document.getElementById('prog-mark-done')?.addEventListener('click', () => {
            const targets = [..._st.selected];
            targets.forEach(tid => {
                const prog = flatPrograms.find(p => p._uid === tid);
                if (!prog) return;
                prog.done = true;
                doneSet.add(tid);
                const tRow = tableRef.getRows('active').find(r => r.getData()._uid === tid);
                if (tRow) {
                    applyRowClass(tRow, true);
                    const cb = tRow.getElement()?.querySelector('.prog-check');
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
                        'PAN_MATREF', 'PROG_FILENAME', 'PROG_PHASENAME', 'TOOLS_STR', 'PROG_COMMENT']
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
                    tableRef.download('csv', 'CNC_Programs.csv', { delimiter: window.AVL_CSV ? window.AVL_CSV.getDelimiter() : ';' }));
            }
            if (exportXlsx) {
                exportXlsx.addEventListener('click', () =>
                    tableRef.download('xlsx', 'CNC_Programs.xlsx', { sheetName: 'CNC Programs' }));
            }
        }

        // Save State
        document.getElementById('save-state-btn')?.addEventListener('click', () => {
            if (window.AVL_SAVE) window.AVL_SAVE.download();
        });

        // Footer
        if (reportData && reportData.Project) {
            const prj = reportData.Project;
            const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '—'; };
            setEl('foot-cus', prj.CUS_NAME);
            setEl('foot-projnr', prj.PRJ_NR);
            setEl('foot-eng', prj.ENGINEER);
            setEl('foot-projname', prj.PRJ_NAME);
            setEl('foot-projpos', prj.PRJ_POSITION);
            setEl('foot-report', (prj.REPORT_TYPE || '') + " | " + (prj.REPORT_VERSION || ''));
        }

        // Close export dropdown on outside click
        document.addEventListener('click', e => {
            if (!e.target.closest('#export-dropdown-wrap')) closeDropdown('export-menu', 'export-btn');
        });

    } // initProgramsTable
    document.addEventListener('DOMContentLoaded', initProgramsTable);
    window.addEventListener('avl:viewChanged', function(e) {
        if (e.detail && e.detail.view === 'programs') initProgramsTable();
    });

    // ── Helpers ───────────────────────────────────────────────────────────────────
    function toggleDropdown(btnId, menuId) {
        document.getElementById(btnId)?.addEventListener('click', function (e) {
            e.stopPropagation();
            const menu = document.getElementById(menuId);
            const btn = document.getElementById(btnId);
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

    // ── PDF Label Download — pure jsPDF drawing (no html2canvas, no DOM capture) ───
    // QR: qrcodejs renders synchronously to a temp canvas → read as PNG dataURL.
    // Page size: exactly 100×50mm landscape (matches the HTML label definition).

    function qrToDataURL(text, sizePx) {
        if (!text || typeof QRCode === 'undefined') return null;
        const tmp = document.createElement('div');
        tmp.style.cssText = 'position:absolute;top:-9999px;left:0;';
        document.body.appendChild(tmp);
        try {
            new QRCode(tmp, { text, width: sizePx, height: sizePx, correctLevel: QRCode.CorrectLevel.M });
            const canvas = tmp.querySelector('canvas');
            const url = canvas ? canvas.toDataURL('image/png') : null;
            document.body.removeChild(tmp);
            return url;
        } catch (e) {
            if (document.body.contains(tmp)) document.body.removeChild(tmp);
            return null;
        }
    }

    function loadImageDataURL(src, doRotate, timeoutMs) {
        return new Promise((resolve) => {
            let resolved = false;
            const timer = setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, timeoutMs);

            function finish(data) {
                if (!resolved) { resolved = true; clearTimeout(timer); resolve(data); }
            }

            if (src.startsWith('data:')) {
                if (!doRotate) return finish(src);
                return attemptCanvasFallback(src, null);
            }

            // Always resolve to an absolute URL to avoid fetch relative path quirks
            const absSrc = new URL(src, window.document.baseURI || window.location.href).href;

            function fetchBlobXHR(url) {
                return new Promise((res, rej) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', url, true);
                    xhr.responseType = 'blob';
                    xhr.onload = () => {
                        if (xhr.status === 200 || xhr.status === 0) {
                            if (xhr.response && xhr.response.size > 0) res(xhr.response);
                            else rej(new Error('Empty response'));
                        } else rej(new Error('Status ' + xhr.status));
                    };
                    xhr.onerror = () => rej(new Error('Network error'));
                    xhr.send();
                });
            }

            async function tryLoad() {
                let blob = null;

                // 1. Fetch API (CORS)
                if (!blob) {
                    try { 
                        const resp = await fetch(absSrc, { mode: 'cors' });
                        const b = await resp.blob(); 
                        if (b.size > 0) blob = b;
                    } catch(e) {}
                }

                // 2. Fetch API (default)
                if (!blob) {
                    try { 
                        const resp = await fetch(absSrc);
                        const b = await resp.blob(); 
                        if (b.size > 0) blob = b;
                    } catch(e) {}
                }

                // 3. XHR Blob
                if (!blob) {
                    try { blob = await fetchBlobXHR(absSrc); } catch (e) {}
                }

                if (blob) {
                    if (!doRotate) {
                        const reader = new FileReader();
                        reader.onloadend = () => finish(reader.result);
                        reader.onerror = () => attemptCanvasFallback(absSrc);
                        reader.readAsDataURL(blob);
                        return;
                    } else {
                        const blobUrl = URL.createObjectURL(blob);
                        attemptCanvasFallback(blobUrl, blobUrl);
                        return;
                    }
                }

                // Fallback to Image -> Canvas
                attemptCanvasFallback(absSrc, null);
            }

            function attemptCanvasFallback(imageSrc, blobUrlToRevoke) {
                const img = new Image();
                const isFileProtocol = window.location.protocol === 'file:';
                
                // Only use crossOrigin if not file:// and not blobUrl
                if (!blobUrlToRevoke && !isFileProtocol) {
                    img.crossOrigin = 'Anonymous';
                }
                
                img.onload = () => {
                    try {
                        const c = document.createElement('canvas');
                        const ctx = c.getContext('2d');
                        if (doRotate) {
                            c.width = img.naturalHeight;
                            c.height = img.naturalWidth;
                            ctx.translate(c.width / 2, c.height / 2);
                            ctx.rotate(90 * Math.PI / 180);
                            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
                        } else {
                            c.width = img.naturalWidth;
                            c.height = img.naturalHeight;
                            ctx.drawImage(img, 0, 0);
                        }
                        const data = c.toDataURL('image/jpeg', 0.85);
                        if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke);
                        finish(data);
                    } catch(e) {
                        console.error('Canvas tainted for image:', imageSrc, e);
                        if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke);
                        finish(null);
                    }
                };

                img.onerror = () => {
                    if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke);
                    // Retry without crossOrigin if we used it
                    if (img.crossOrigin) {
                        const img2 = new Image();
                        img2.onload = () => {
                            try {
                                const c = document.createElement('canvas');
                                const ctx = c.getContext('2d');
                                if (doRotate) {
                                    c.width = img2.naturalHeight;
                                    c.height = img2.naturalWidth;
                                    ctx.translate(c.width / 2, c.height / 2);
                                    ctx.rotate(90 * Math.PI / 180);
                                    ctx.drawImage(img2, -img2.naturalWidth / 2, -img2.naturalHeight / 2);
                                } else {
                                    c.width = img2.naturalWidth;
                                    c.height = img2.naturalHeight;
                                    ctx.drawImage(img2, 0, 0);
                                }
                                finish(c.toDataURL('image/jpeg', 0.85));
                            } catch(err) { finish(null); }
                        };
                        img2.onerror = () => finish(null);
                        img2.src = imageSrc;
                    } else {
                        finish(null);
                    }
                };
                img.src = imageSrc;
            }

            tryLoad();
        });
    }

    // ── Truncate a string so doc.getTextWidth(str) <= maxMM ──────────────────────
    function truncMM(doc, str, maxMM) {
        if (!str) return '';
        str = String(str);
        while (str.length > 1 && doc.getTextWidth(str) > maxMM) str = str.slice(0, -1);
        return str;
    }

    // ── Draw one label page (100×50mm) into an open jsPDF doc ────────────────────
    async function drawLabel(doc, data) {
        const proj = (typeof reportData !== 'undefined') ? reportData.Project : {};
        const project = proj.PRJ_NAME || '';
        const prjNr = proj.PRJ_NR || '';
        const prjPos = proj.PRJ_POSITION || '';
        const cus = proj.CUS_NAME || '';
        const desc = data.DESCRIPTION || '—';
        const fname = data.FILENAME || '—';
        const snr = data.SNR_CAB || '—';
        const list = data.SNR_CABList || '—';
        const cabDesc = data._cabDesc || desc;
        const matRef = data.PAN_MATREF || '';
        const lamTop = data.PAN_LAMTOP_MATREF || '';
        const lamBot = data.PAN_LAMBOT_MATREF || '';
        const lStr = data.PAN_LWEB || '—';
        const bStr = data.PAN_WWEB || '—';
        const thick = data.PAN_TWL || '—';
        const rl = data.PAN_STL || '';
        const rb = data.PAN_STW || '';
        const rd = data.PAN_STT || '';
        const ebF = data.PAN_EBF_MATREF || '';
        const ebB = data.PAN_EBB_MATREF || '';
        const ebL = data.PAN_EBL_MATREF || '';
        const ebR = data.PAN_EBR_MATREF || '';
        const comment = data.COMMENT || '';

        const CAB_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#06B6D4', '#F97316', '#EC4899', '#84CC16', '#14B8A6',
            '#A855F7', '#6366F1', '#F43F5E', '#0EA5E9', '#D97706'];
        const cabColorHex = (data._cabIdx === null || data._cabIdx === undefined || data._cabIdx < 0) ? '#9CA3AF' : CAB_COLORS[data._cabIdx % CAB_COLORS.length];
        const hex2rgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
        const [cabR, cabG, cabB] = hex2rgb(cabColorHex);

        const programs = Array.isArray(data.PROGRAMS) ? data.PROGRAMS : [];
        const qrProgs = programs.filter(p => p.PROG_FILENAME && p.PROG_FILENAME.trim()).slice(0, 2);

        // ── Colour palette (exact match to HTML labels) ──────────────────────────
        const PW = 100, PH = 50;
        const BG = [255, 255, 255];       
        const BG_IMG = [255, 255, 255];   
        const BORDER = [0, 0, 0];     
        const TXT = [0, 0, 0];         
        const ACCENT = [0, 0, 0];     
        const MUTED = [0, 0, 0];    

        // ── Layout Proportions ───────────────────────────────────────────────────
        const TOP_H = 17;
        const COL_INFO = 39;
        const COL_REFS = 60;
        const IMG_W = 60;
        const BOT_Y = TOP_H;

        // ── Typography Scales (HTML -> 100x50mm PDF) ─────────────────────────────
        const FONT_SM = 4;    // 11px CSS equivalent
        const FONT_MD = 5;    // 13px CSS equivalent
        const FONT_LG = 6;    // 15px CSS equivalent

        // ── Backgrounds ──────────────────────────────────────────────────────────
        doc.setFillColor(...BG);
        doc.rect(0, 0, PW, PH, 'F');
        doc.setFillColor(...BG_IMG);
        doc.rect(0, BOT_Y, IMG_W, PH - BOT_Y, 'F');

        // ── Borders ──────────────────────────────────────────────────────────────
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.1);
        doc.line(0, TOP_H, PW, TOP_H);
        doc.line(COL_INFO, 0, COL_INFO, TOP_H);
        doc.line(COL_REFS, 0, COL_REFS, TOP_H);
        doc.line(IMG_W, BOT_Y, IMG_W, PH);
        doc.rect(0, 0, PW, PH);

        // ── Info Column (0 → 39mm) ───────────────────────────────────────────────
        const IM = 2; 
        let iy = 2.5;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
        doc.text(((prjNr || '') + (prjPos ? ' | ' + prjPos : '')).toUpperCase(), IM, iy);
        iy += 3.0;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_MD); doc.setTextColor(...ACCENT);
        doc.text(truncMM(doc, project, COL_INFO - IM - 1), IM, iy);
        iy += 2.5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
        doc.text(truncMM(doc, cus, COL_INFO - IM - 1), IM, iy);
        iy += 3.2;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_LG); doc.setTextColor(...TXT);
        doc.text(truncMM(doc, desc, COL_INFO - IM - 1), IM, iy);
        iy += 2.5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
        doc.text(truncMM(doc, comment || ' ', COL_INFO - IM - 1), IM, iy);

        // ── Refs Column (39 → 60mm) ──────────────────────────────────────────────
        const RL = COL_INFO + 2;
        let ry = 2.5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
        doc.text(truncMM(doc, cabDesc, COL_REFS - RL - 1), RL, ry);
        ry += 3.5;
        doc.setFillColor(cabR, cabG, cabB);
        doc.rect(RL, ry - 2.0, 2.0, 2.0, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_LG); doc.setTextColor(...TXT);
        doc.text(truncMM(doc, snr, COL_REFS - RL - 4), RL + 3, ry);
        ry += 3.2;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
        doc.text('List', RL, ry);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_MD); doc.setTextColor(...TXT);
        doc.text(truncMM(doc, list, COL_REFS - RL - 6), RL + 5, ry);
        ry += 3.0;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
        doc.text('ID', RL, ry);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
        doc.text(truncMM(doc, fname, COL_REFS - RL - 5), RL + 4, ry);

        // ── QR Zone (60 → 100mm) ─────────────────────────────────────────────────
        const QZW = PW - COL_REFS;
        const QSZ = 10; 
        const qSpace = (QZW - (2 * QSZ)) / 3;
        for (let qi = 0; qi < 2; qi++) {
            const prog = qrProgs[qi];
            const qx = COL_REFS + qSpace + qi * (QSZ + qSpace);
            const qy = 2.0;
            if (prog && prog.PROG_FILENAME) {
                const qrUrl = qrToDataURL(prog.PROG_FILENAME, 104);
                if (qrUrl) {
                    doc.setFillColor(255, 255, 255);
                    doc.rect(qx, qy, QSZ, QSZ, 'F');
                    doc.addImage(qrUrl, 'PNG', qx, qy, QSZ, QSZ);
                }
                const lbl = prog.PROG_FILENAME;
                doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
                doc.text(truncMM(doc, lbl, QSZ + qSpace), qx + QSZ/2, qy + QSZ + 2.5, { align: 'center' });
            } else {
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(210, 216, 226);
                doc.setLineWidth(0.1);
                doc.rect(qx, qy, QSZ, QSZ, 'FD');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_LG); doc.setTextColor(...MUTED);
                doc.text('-', qx + QSZ/2, qy + QSZ/2 + 1.0, { align: 'center' });
                doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
                doc.text('No program', qx + QSZ/2, qy + QSZ + 2.5, { align: 'center' });
            }
        }

        // ── Image Zone (0 → 60mm Bottom) ─────────────────────────────────────────
        const BOT_H = PH - TOP_H;
        const IP = 2;
        doc.setDrawColor(210, 216, 226); doc.setLineWidth(0.1);
        const IB_X = IP, IB_Y = BOT_Y + IP, IB_W = IMG_W - 2*IP, IB_H = BOT_H - 2*IP;
        
        let imgSrc = `../IMG/Labels/${fname}_Label.jpg`;
        if (typeof userSelectedImages !== 'undefined' && userSelectedImages[`${fname}_Label.jpg`]) {
            imgSrc = userSelectedImages[`${fname}_Label.jpg`];
        } else if (data.LABEL_IMG_BASE64) {
            imgSrc = data.LABEL_IMG_BASE64.startsWith('data:') 
                ? data.LABEL_IMG_BASE64 
                : 'data:image/jpeg;base64,' + data.LABEL_IMG_BASE64;
        }

        const lNum = parseFloat(data.PAN_LWEB) || 0;
        const bNum = parseFloat(data.PAN_WWEB) || 0;
        const doRotate = bNum > lNum && lNum > 0;
        const imgData = await loadImageDataURL(imgSrc, doRotate, 2500);
        if (imgData) {
            const dim = await new Promise(res => {
                const img = new Image();
                img.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = img.width; c.height = img.height;
                    const ctx = c.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0);
                    try {
                        const data = ctx.getImageData(0, 0, c.width, c.height).data;
                        let top = 0, bottom = c.height, left = 0, right = c.width;
                        const isBg = (i) => data[i] >= 250 && data[i+1] >= 250 && data[i+2] >= 250;
                        
                        topLoop: for (let y = 0; y < c.height; y++) {
                            for (let x = 0; x < c.width; x++) {
                                if (!isBg((y * c.width + x) * 4)) { top = y; break topLoop; }
                            }
                        }
                        if (top === c.height) return res({w: img.width, h: img.height, url: img.src});
                        
                        bottomLoop: for (let y = c.height - 1; y >= 0; y--) {
                            for (let x = 0; x < c.width; x++) {
                                if (!isBg((y * c.width + x) * 4)) { bottom = y; break bottomLoop; }
                            }
                        }
                        leftLoop: for (let x = 0; x < c.width; x++) {
                            for (let y = 0; y < c.height; y++) {
                                if (!isBg((y * c.width + x) * 4)) { left = x; break leftLoop; }
                            }
                        }
                        rightLoop: for (let x = c.width - 1; x >= 0; x--) {
                            for (let y = 0; y < c.height; y++) {
                                if (!isBg((y * c.width + x) * 4)) { right = x; break rightLoop; }
                            }
                        }
                        
                        const pad = 2;
                        top = Math.max(0, top - pad);
                        bottom = Math.min(c.height, bottom + pad);
                        left = Math.max(0, left - pad);
                        right = Math.min(c.width, right + pad);
                        
                        const cropW = right - left;
                        const cropH = bottom - top;
                        const cc = document.createElement('canvas');
                        cc.width = cropW; cc.height = cropH;
                        cc.getContext('2d').drawImage(c, left, top, cropW, cropH, 0, 0, cropW, cropH);
                        
                        res({ w: cropW, h: cropH, url: cc.toDataURL('image/jpeg', 0.9) });
                    } catch(e) { res({ w: img.width, h: img.height, url: img.src }); }
                };
                img.onerror = () => res({w: 1, h: 1, url: imgData});
                img.src = imgData;
            });
            const imgAspect = dim.w / dim.h;
            const boxAspect = IB_W / IB_H;
            let drawW = IB_W, drawH = IB_H;
            let drawX = IB_X, drawY = IB_Y;
            
            if (imgAspect > boxAspect) {
                drawH = drawW / imgAspect;
                drawY += (IB_H - drawH) / 2;
            } else {
                drawW = drawH * imgAspect;
                drawX += (IB_W - drawW) / 2;
            }
            doc.addImage(dim.url, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');
            
            if (doRotate) {
                if (!cachedRotateIconPNG) cachedRotateIconPNG = await getRotateIconPNG();
                if (cachedRotateIconPNG) {
                    doc.setFillColor(255, 255, 255);
                    doc.rect(IB_X + 0.5, IB_Y + 0.5, 4.5, 4.5, 'F');
                    doc.addImage(cachedRotateIconPNG, 'PNG', IB_X + 1, IB_Y + 1, 3.5, 3.5, undefined, 'FAST');
                }
            }
        } else {
            const cx = IMG_W / 2;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_MD); doc.setTextColor(...TXT);
            doc.text(truncMM(doc, fname, IMG_W - 4), cx, BOT_Y + 7, { align: 'center' });
            doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_LG); doc.setTextColor(...TXT);
            doc.text(truncMM(doc, `${lStr} x ${bStr}`, IMG_W - 4), cx, BOT_Y + 16, { align: 'center' });
            doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
            doc.text('mm', cx, BOT_Y + 19.5, { align: 'center' });
            if (matRef) {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_MD);
                doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
                doc.text(truncMM(doc, matRef, IMG_W - 4), cx, BOT_Y + 25, { align: 'center' });
            }
        }

        // ── Info Zone (60 → 100mm Bottom) ────────────────────────────────────────
        const IX = IMG_W + 2;
        const IW = PW - IMG_W - 4;
        let vy = BOT_Y + 2.5;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
        doc.text('L x B x D', IX, vy);
        vy += 2.5;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_LG); doc.setTextColor(...TXT);
        doc.text(truncMM(doc, `${lStr} x ${bStr} x ${thick}`, IW), IX, vy);
        vy += 2.5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
        doc.text('RL x RB x RD', IX, vy);
        vy += 2.0;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_SM); doc.setTextColor(...MUTED);
        doc.text(truncMM(doc, `${rl} x ${rb} x ${rd}`, IW), IX, vy);
        vy += 1.5;
        
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.1);
        doc.line(IX, vy, PW - 2, vy);
        vy += 2.5;

        const valColor = v => v ? TXT : MUTED;

        // Materials
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.1);
        doc.line(IX, vy - 1.0, IX + 2, vy - 1.0);
        doc.line(IX + 1, vy - 1.0, IX + 1, vy + 0.5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_MD); doc.setTextColor(...valColor(lamTop));
        doc.text(truncMM(doc, lamTop || '—', IW - 4), IX + 4, vy);
        vy += 2.8;
        
        doc.setFillColor(...ACCENT);
        doc.rect(IX + 0.3, vy - 1.2, 1.2, 1.2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_MD); doc.setTextColor(...valColor(matRef));
        doc.text(truncMM(doc, matRef || '—', IW - 4), IX + 4, vy);
        vy += 2.8;
        
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.1);
        doc.line(IX, vy + 0.5, IX + 2, vy + 0.5);
        doc.line(IX + 1, vy + 0.5, IX + 1, vy - 1.0);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_MD); doc.setTextColor(...valColor(lamBot));
        doc.text(truncMM(doc, lamBot || '—', IW - 4), IX + 4, vy);
        vy += 1.5;

        doc.setDrawColor(...BORDER); doc.setLineWidth(0.1);
        doc.line(IX, vy, PW - 2, vy);
        vy += 2.5;

        // Edges
        doc.setFontSize(FONT_MD);
        const edges = [['F', ebF], ['B', ebB], ['L', ebL], ['R', ebR]];
        for (const [lbl, val] of edges) {
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...MUTED); 
            doc.text(lbl, IX, vy);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(...valColor(val));
            doc.text(truncMM(doc, val || '—', IW - 4), IX + 4, vy);
            vy += 2.2;
        }

        // Outer border
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.1);
        doc.rect(0, 0, PW, PH);
    }

    function getLabelsFolderHint() {
        try {
            const htmlDir = window.location.href.replace(/\/[^/]+$/, '');
            const srcDir  = htmlDir.replace(/\/[^/]+$/, '');
            return decodeURIComponent(srcDir)
                .replace(/^file:\/\/\//i, '')
                .replace(/\//g, '\\') + '\\IMG\\Labels';
        } catch (e) { return '_SOURCE\\IMG\\Labels'; }
    }

    function showLabelsFolderDialog(path) {
        return new Promise((resolve) => {
            // ── i18n helper — falls back if AVL_LANG not yet loaded ──
            const T = (key, fb) => (window.AVL_LANG ? window.AVL_LANG.t(key) : fb);

            // ── Backdrop ──
            const backdrop = document.createElement('div');
            backdrop.style.cssText = [
                'position:fixed','top:0','left:0','width:100%','height:100%',
                'background:rgba(0,0,0,0.55)','backdrop-filter:blur(3px)',
                'display:flex','align-items:center','justify-content:center',
                'z-index:9998'
            ].join(';');

            // ── Dialog box ──
            const box = document.createElement('div');
            box.style.cssText = [
                'background:var(--color-bg-sidebar,#1e2130)',
                'color:var(--color-text-primary,#e2e8f0)',
                'border:1px solid var(--color-border-hr,#2d3452)',
                'border-radius:6px',
                'padding:24px 24px 20px',
                'width:480px','max-width:94vw',
                'box-shadow:0 12px 40px rgba(0,0,0,0.45)',
                'font-family:inherit','font-size:13px'
            ].join(';');

            // ── Icon + heading + close button ──
            const heading = document.createElement('div');
            heading.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:14px';
            heading.innerHTML = `
                <span class="material-symbols-rounded" style="font-size:22px;color:var(--color-active-primary,#3B82F6)">folder_open</span>
                <strong style="font-size:14px;flex:1">${T('label.dialog.title', 'Include Label Images?')}</strong>`;

            const closeBtn = document.createElement('button');
            closeBtn.style.cssText = [
                'flex-shrink:0','display:flex','align-items:center','justify-content:center',
                'background:transparent','border:none',
                'color:var(--color-text-placeholder,#94a3b8)',
                'border-radius:4px','padding:2px','cursor:pointer',
                'transition:color 0.15s,background 0.15s'
            ].join(';');
            closeBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:20px">close</span>';
            closeBtn.title = T('modal.close', 'Close');
            closeBtn.onmouseover = () => {
                closeBtn.style.color = 'var(--color-text-primary,#e2e8f0)';
                closeBtn.style.background = 'var(--color-bg-secondary,#252a3f)';
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.color = '';
                closeBtn.style.background = '';
            };
            closeBtn.onclick = () => { document.body.removeChild(backdrop); resolve(null); };
            heading.appendChild(closeBtn);

            // ── Body text ──
            const body = document.createElement('p');
            body.style.cssText = 'margin:0 0 12px;color:var(--color-text-placeholder,#94a3b8);line-height:1.55';
            body.textContent = T('label.dialog.body', 'To embed part images in the PDF, select the Labels folder in the next dialog. Copy the path below and paste it into the dialog address bar.');

            // ── Path row ──
            const pathRow = document.createElement('div');
            pathRow.style.cssText = [
                'display:flex','align-items:center','gap:8px',
                'background:var(--color-bg-primary,#151826)',
                'border:1px solid var(--color-bg-secondary,#252a3f)',
                'border-radius:4px','padding:9px 12px','margin-bottom:20px'
            ].join(';');

            const pathText = document.createElement('span');
            pathText.style.cssText = 'flex:1;font-family:monospace;font-size:11.5px;word-break:break-all;user-select:all;color:var(--color-text-primary,#e2e8f0)';
            pathText.textContent = path;

            const lblCopy   = T('label.dialog.copy',   'Copy');
            const lblCopied = T('label.dialog.copied', 'Copied!');
            const iconCopy  = '<span class="material-symbols-rounded" style="font-size:16px">content_copy</span>';
            const iconCheck = '<span class="material-symbols-rounded" style="font-size:16px">check</span>';

            const copyBtn = document.createElement('button');
            copyBtn.style.cssText = [
                'flex-shrink:0','display:flex','align-items:center','gap:4px',
                'background:var(--color-bg-secondary,#252a3f)',
                'border:1px solid var(--color-border-hr,#2d3452)',
                'color:var(--color-text-primary,#e2e8f0)',
                'border-radius:4px','padding:5px 10px',
                'cursor:pointer','font-size:12px','font-family:inherit',
                'transition:background 0.15s,color 0.15s'
            ].join(';');
            copyBtn.innerHTML = `${iconCopy} ${lblCopy}`;
            copyBtn.title = lblCopy;
            function flashCopied() {
                copyBtn.innerHTML = `${iconCheck} ${lblCopied}`;
                copyBtn.style.color = 'var(--color-active-primary,#3B82F6)';
                setTimeout(() => {
                    copyBtn.innerHTML = `${iconCopy} ${lblCopy}`;
                    copyBtn.style.color = '';
                }, 2000);
            }

            copyBtn.onclick = () => {
                navigator.clipboard.writeText(path).then(flashCopied).catch(() => {
                    // Fallback for file:// where clipboard may be blocked
                    try { const ta = document.createElement('textarea'); ta.value = path; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); } catch(e){}
                    flashCopied();
                });
            };

            pathRow.appendChild(pathText);
            pathRow.appendChild(copyBtn);

            // ── Action buttons ──
            const footer = document.createElement('div');
            footer.style.cssText = 'display:flex;justify-content:flex-end;gap:10px';

            const cancelBtn = document.createElement('button');
            cancelBtn.style.cssText = [
                'padding:8px 18px',
                'background:var(--color-bg-secondary,#252a3f)',
                'border:1px solid var(--color-border-hr,#2d3452)',
                'color:var(--color-text-primary,#e2e8f0)',
                'border-radius:4px','cursor:pointer','font-family:inherit','font-size:13px'
            ].join(';');
            cancelBtn.textContent = T('label.dialog.skip', 'Skip Images');
            cancelBtn.onclick = () => { document.body.removeChild(backdrop); resolve(false); };

            const okBtn = document.createElement('button');
            okBtn.style.cssText = [
                'padding:8px 18px',
                'background:var(--color-active-primary,#3B82F6)',
                'border:none','color:#fff',
                'border-radius:4px','cursor:pointer','font-family:inherit','font-size:13px',
                'display:flex','align-items:center','gap:6px'
            ].join(';');
            okBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size:16px">folder_open</span> ${T('label.dialog.select', 'Select Folder')}`;
            okBtn.onclick = () => { document.body.removeChild(backdrop); resolve(true); };

            footer.appendChild(cancelBtn);
            footer.appendChild(okBtn);

            box.appendChild(heading);
            box.appendChild(body);
            box.appendChild(pathRow);
            box.appendChild(footer);
            backdrop.appendChild(box);
            document.body.appendChild(backdrop);
        });
    }

    // Global selected images cache
    let userSelectedImages = {};
    let cachedRotateIconPNG = null;

    function getRotateIconPNG() {
        return new Promise(resolve => {
            const c = document.createElement('canvas');
            c.width = 64; c.height = 64;
            const ctx = c.getContext('2d');
            ctx.font = '48px "Material Symbols Rounded"';
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('rotate_right', 32, 32);
            resolve(c.toDataURL('image/png'));
        });
    }

    function promptForImages(isMultiple) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            if (isMultiple) {
                input.webkitdirectory = true;
                input.directory = true;
                input.multiple = true;
            } else {
                input.accept = 'image/*';
            }
            let resolved = false;
            
            input.onchange = (e) => {
                if (resolved) return; 
                resolved = true;
                const files = e.target.files;
                userSelectedImages = {}; // Clear previous
                if (files) {
                    for (let i = 0; i < files.length; i++) {
                        userSelectedImages[files[i].name] = URL.createObjectURL(files[i]);
                    }
                }
                resolve(true);
            };
            
            input.oncancel = () => {
                if (!resolved) { resolved = true; resolve(false); }
            };
            
            input.click();
        });
    }

    // ── Main print entry point ────────────────────────────────────────────────────
    async function printLabels(partsArray, downloadFilename) {
        if (!partsArray || !partsArray.length) { alert('No labels to print.'); return; }

        const jspdfLib = window.jspdf || (typeof jspdf !== 'undefined' ? jspdf : null);
        if (!jspdfLib) { alert('jsPDF not loaded — check internet connection.'); return; }
        const { jsPDF } = jspdfLib;

        // Custom folder dialog with copy-to-clipboard button
        // null  = user dismissed/closed → abort entirely
        // true  = user clicked "Select Folder" → pick folder then generate
        // false = user clicked "Skip Images"   → generate without images
        const userWantsImages = await showLabelsFolderDialog(getLabelsFolderHint());
        if (userWantsImages === null) return;   // ← close/X clicked — abort
        if (userWantsImages) {
            const folderPicked = await promptForImages(true);
            if (!folderPicked) return;   // ← native folder picker cancelled — abort
        } else {
            userSelectedImages = {};
        }

        const overlay = document.getElementById('print-overlay');
        const overlayMsg = document.getElementById('print-overlay-msg');
        if (overlay) overlay.style.display = 'flex';

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [100, 50] });

        for (let i = 0; i < partsArray.length; i++) {
            if (overlayMsg) overlayMsg.textContent = `Generating PDF… ${i + 1} / ${partsArray.length}`;
            if (i > 0) doc.addPage([100, 50], 'landscape');
            await drawLabel(doc, partsArray[i]);
        }

        if (overlay) overlay.style.display = 'none';

        const safeName = (downloadFilename || 'Labels').replace(/[/\\?%*:|"<>]/g, '_');
        doc.save(`${safeName}.pdf`);
    }

    window.generatePDFLabels = printLabels;

})();
