function initPurchaseTable() {
    let purchaseTable;
    let rawData = [];

    const viewSec = document.getElementById('view-purchase') || document;
    const tableEl = viewSec.querySelector('#data-table') || document.getElementById('purchase-table');
    if (!tableEl) return;
    if (tableEl.classList.contains('tabulator') && tableEl.children.length > 0) return;

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

    // Parse EXTERNALPRODUCTION from tabledata.js
    const getArray = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'object') return [v];
        return [];
    };
    if (typeof reportData !== 'undefined' && reportData && reportData.Project) {
        const proj = reportData.Project;
        const ext = getArray(proj.EXTERNALPRODUCTION);
        rawData = rawData.concat(ext);

        const cabinets = getArray(proj.CABINET);
        if (cabinets.length > 0) {
            const sortedCabs = [...cabinets];
            sortedCabs.sort((a, b) => {
                const valA = a.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (a.SNR_CAB || 'No CAB');
                const valB = b.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (b.SNR_CAB || 'No CAB');
                return String(valA).localeCompare(String(valB), undefined, { numeric: true });
            });
            const cabBySNR = {};
            sortedCabs.forEach((c, cabIdx) => { if (c.SNR_CAB) cabBySNR[c.SNR_CAB] = { cabIdx, cab: c }; });
            rawData.forEach(item => {
                const snr = item.SNR_CAB || '';
                const cabInfo = snr ? cabBySNR[snr] : null;
                item._cabIdx  = cabInfo ? cabInfo.cabIdx : -1;
                item._cabDesc = cabInfo ? (cabInfo.cab.DESCRIPTION_CAB || '') : '';
                if (!cabInfo) item.SNR_CAB = "No CAB";
            });
        }
    }

    const summaryCb = viewSec.querySelector('#use-summary-cb') || document.getElementById("use-summary-cb");

    function getTableData() {
        if (summaryCb && summaryCb.checked) {
            const map = {};
            rawData.forEach(p => {
                const key = `${p.DESCRIPTION}_${p.FILENAME}`;
                if (!map[key]) {
                    map[key] = {
                        DESCRIPTION: p.DESCRIPTION,
                        FILENAME: p.FILENAME,
                        SNR_CAB: p.SNR_CAB,
                        SNR_CABList: p.SNR_CABList || p.SNR_CAB,
                        _cabIdx: p._cabIdx,
                        _filenames: p.FILENAME ? [p.FILENAME] : [],
                        QTY: parseFloat(p.QTY || p.QUANTITY) || 0,
                        COMMENT: p.COMMENT || ""
                    };
                } else {
                    map[key].QTY += (parseFloat(p.QTY || p.QUANTITY) || 0);
                    if (p.FILENAME && !map[key]._filenames.includes(p.FILENAME)) map[key]._filenames.push(p.FILENAME);
                    if (p.SNR_CAB && !map[key].SNR_CABList.includes(p.SNR_CAB)) {
                        map[key].SNR_CABList += `, ${p.SNR_CAB}`;
                    }
                }
            });
            return Object.values(map);
        } else {
            return rawData.map(p => {
                const q = parseFloat(p.QTY || p.QUANTITY) || 0;
                return Object.assign({ _filenames: p.FILENAME ? [p.FILENAME] : [], QTY: q }, p);
            });
        }
    }

    function getColumns() {
        const isSummarized = summaryCb ? summaryCb.checked : false;
        let w = {};
        if (tableEl && tableEl.dataset.colWidths) {
            try { w = JSON.parse(tableEl.dataset.colWidths); } catch (e) {}
        }
        const imgFolder = window.AVL_OFFLINE_MODE ? '_SOURCE/IMG/' : '../IMG/';

        return [
            {
                title: window.AVL_LANG.t("th.thumbnail"),
                field: "_img",
                mutator: function(value, data) { return data.FILENAME || ""; },
                width: 68,
                minWidth: 55,
                hozAlign: "center",
                vertAlign: "middle",
                headerSort: false,
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const filenames = (data._filenames && data._filenames.length)
                        ? data._filenames
                        : (data.FILENAME ? [data.FILENAME] : []);
                    if (!filenames.length) return '<span style="opacity:0.15;font-size:1.4em;line-height:62px;">&#9635;</span>';

                    const attemptsJson = JSON.stringify(filenames.map(fn => `${imgFolder}Part/${fn}_Part.jpg`));
                    const firstSrc = `${imgFolder}Part/${filenames[0]}_Part.jpg`;
                    return `<img data-attempts='${attemptsJson}' data-idx='0'
                        src="${firstSrc}"
                        style="max-height:54px;max-width:60px;object-fit:contain;display:block;margin:auto;"
                        onerror="(function(el){var a=JSON.parse(el.dataset.attempts),i=parseInt(el.dataset.idx)+1;if(i<a.length){el.dataset.idx=i;el.src=a[i];}else{el.style.display='none';}})(this)"
                    />`;
                },
                download: false
            },
            { 
                title: window.AVL_LANG.t("th.cabsnr"), 
                field: "SNR_CAB", 
                sorter: "alphanum", 
                width: w["SNR_CAB"] || undefined, 
                visible: !isSummarized,
                formatter: function(cell) {
                    const d = cell.getRow().getData();
                    const snr = d.SNR_CAB || "";
                    if (!snr) return "";
                    const col = cabColor(d._cabIdx);
                    return `<span style="display:inline-flex;align-items:center;gap:5px;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${col};flex-shrink:0;"></span>
                        <span>${snr}</span>
                    </span>`;
                }
            },
            { title: window.AVL_LANG.t("th.cablist"), field: "SNR_CABList", sorter: "alphanum", width: w["SNR_CABList"] || undefined },
            {
                title: window.AVL_LANG.t("th.desc"),
                titleDownload: window.AVL_LANG.t("th.desc"),
                field: "DESCRIPTION",
                titleFormatter: function() {
                    return `${window.AVL_LANG.t("th.desc")}<br><span style="font-size:0.85em;font-weight:normal;opacity:0.85;">${window.AVL_LANG.t("th.panelid")}</span>`;
                },
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const desc = data.DESCRIPTION || "";
                    const file = data.FILENAME || "";
                    if (!file) return `<span style="font-weight:600;">${desc}</span>`;
                    return `<span style="font-weight:600;">${desc}</span><div style="margin-top:6px;"><span style="font-size:0.85em;color:var(--color-text-placeholder);">${file}</span></div>`;
                }
            },
            {
                title: window.AVL_LANG.t("th.quantity"),
                field: "QTY",
                sorter: "number",
                hozAlign: "center",
                width: w["QTY"] || undefined,
                formatter: function(cell) {
                    const v = cell.getValue();
                    return `<span style="font-weight:600;">${v}</span>`;
                }
            },
            {
                title: window.AVL_LANG.t("th.comment"),
                field: "COMMENT",
                width: w["COMMENT"] || undefined,
                headerSort: false,
                formatter: function(cell) {
                    const val = cell.getValue();
                    if (!val || !val.trim()) return '<span style="opacity:0.25;">—</span>';
                    return `<span style="font-style:italic;font-size:0.88em;">${val.trim()}</span>`;
                }
            }
        ];
    }

    function renderTable() {
        const data = getTableData();
        const groupSelect = viewSec.querySelector('#group-by') || document.getElementById("group-by");
        const initialGroup = groupSelect ? groupSelect.value : false;
        
        if (typeof Tabulator !== 'undefined' && Tabulator.findTable) {
            const existing = Tabulator.findTable(tableEl);
            if (existing && existing.length > 0) existing[0].destroy();
        }

        purchaseTable = new Tabulator(tableEl, {
            data: data,
            layout: "fitColumns",
            height: "100%",
            rowHeight: 62,
            responsiveLayout: "collapse",
            groupBy: initialGroup || false,
            initialSort: [
                { column: "SNR_CABList", dir: "asc" },
                { column: "SNR_CAB", dir: "asc" }
            ],
            columnDefaults: { tooltip: true },
            columns: getColumns()
        });

        purchaseTable.on("tableBuilt", updateItemCount);
        purchaseTable.on("dataLoaded", updateItemCount);
        purchaseTable.on("dataFiltered", updateItemCount);
        
        updateItemCount();
    }

    function updateItemCount() {
        const countDiv = viewSec.querySelector('#item-count-display') || document.getElementById("item-count-display");
        if (countDiv && purchaseTable) {
            const activeCount = purchaseTable.getData("active").length;
            countDiv.innerHTML = window.AVL_LANG.t("ui.totalitems", {count: activeCount});
        }
    }

    renderTable();

    if (summaryCb) {
        summaryCb.addEventListener("change", () => renderTable());
    }

    const searchInput = viewSec.querySelector('#global-search') || document.getElementById("global-search");
    if (searchInput) {
        searchInput.addEventListener("input", e => {
            const val = e.target.value.toLowerCase();
            if (purchaseTable) {
                purchaseTable.setFilter(data => {
                    return String(data.DESCRIPTION || "").toLowerCase().includes(val) ||
                           String(data.FILENAME || "").toLowerCase().includes(val) ||
                           String(data.SNR_CAB || "").toLowerCase().includes(val) ||
                           String(data.SNR_CABList || "").toLowerCase().includes(val) ||
                           String(data.COMMENT || "").toLowerCase().includes(val);
                });
            }
        });
    }

    const groupBySelect = viewSec.querySelector('#group-by') || document.getElementById("group-by");
    if (groupBySelect) {
        groupBySelect.addEventListener("change", e => {
            const val = e.target.value;
            if (purchaseTable) purchaseTable.setGroupBy(val ? val : false);
        });
    }

    const exportBtn = viewSec.querySelector('#export-btn') || document.getElementById("export-btn");
    const exportMenu = viewSec.querySelector('#export-menu') || document.getElementById("export-menu");
    const exportCsv = viewSec.querySelector('#export-csv') || document.getElementById("export-csv");
    const exportXlsx = viewSec.querySelector('#export-xlsx') || document.getElementById("export-xlsx");

    if (exportBtn && exportMenu) {
        exportBtn.addEventListener("click", e => {
            e.stopPropagation();
            exportMenu.classList.toggle("show");
            exportBtn.classList.toggle("active");
        });

        document.addEventListener("click", () => {
            if (exportMenu.classList.contains("show")) {
                exportMenu.classList.remove("show");
                exportBtn.classList.remove("active");
            }
        });

        if (exportCsv) {
            exportCsv.addEventListener("click", () => {
                if (purchaseTable) purchaseTable.download("csv", "Purchase_Report.csv", {delimiter: window.AVL_CSV ? window.AVL_CSV.getDelimiter() : ";"});
            });
        }

        if (exportXlsx) {
            exportXlsx.addEventListener("click", () => {
                if (purchaseTable) purchaseTable.download("xlsx", "Purchase_Report.xlsx", {sheetName:"Purchase Data"});
            });
        }
    }

    window.addEventListener("avl:langChanged", () => {
        if (purchaseTable) purchaseTable.setColumns(getColumns());
        updateItemCount();
    });
}
document.addEventListener("DOMContentLoaded", initPurchaseTable);
window.addEventListener("avl:viewChanged", function(e) {
    if (e.detail && e.detail.view === 'purchase') initPurchaseTable();
});
