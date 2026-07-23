// ── Cabinet colour palette (mirrors cutting.js) ──────────────────────────────
const _PANEL_CAB_COLORS = [
    'var(--color-cab-0)','var(--color-cab-1)','var(--color-cab-2)','var(--color-cab-3)','var(--color-cab-4)',
    'var(--color-cab-5)','var(--color-cab-6)','var(--color-cab-7)','var(--color-cab-8)','var(--color-cab-9)',
    'var(--color-cab-10)','var(--color-cab-11)','var(--color-cab-12)','var(--color-cab-13)','var(--color-cab-14)'
];
function _panelCabColor(idx) {
    if (idx === null || idx === undefined || idx < 0) return 'var(--color-cab-nocab)';
    return _PANEL_CAB_COLORS[idx % _PANEL_CAB_COLORS.length];
}
function _panelCabDot(color) {
    return `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0;"></span>`;
}

function initPanelTable() {
    if (typeof reportData === 'undefined') return;

    const viewSec = document.getElementById('view-panels') || document;
    const tableEl = viewSec.querySelector('#data-table') || document.getElementById('data-table');
    if (!tableEl) return;
    if (tableEl.classList.contains('tabulator') && tableEl.children.length > 0) return;

    const getArray = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'object') return [v];
        return [];
    };
    const flatData = [];
    if (reportData && reportData.Project) {
        const proj = reportData.Project;
        const cabBySNR = {};
        const cabFilenames = new Set();
        
        const cabinets = getArray(proj.CABINET);
        if (cabinets.length > 0) {
            const sortedCabs = [...cabinets];
            sortedCabs.sort((a, b) => {
                const valA = a.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (a.SNR_CAB || 'No CAB');
                const valB = b.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (b.SNR_CAB || 'No CAB');
                return String(valA).localeCompare(String(valB), undefined, { numeric: true });
            });
            sortedCabs.forEach((cab, cabIdx) => {
                if (cab.SNR_CAB) cabBySNR[cab.SNR_CAB] = { cabIdx, cab };
                if (cab.FILENAME) cabFilenames.add(cab.FILENAME);
            });
        }
        
        const smallPartLookup = {};
        getArray(proj.SMALLPART).forEach(sp => {
            if (sp.FILENAME && sp.BPINDEX && sp.SPINDEX) {
                smallPartLookup[sp.FILENAME] = { BPINDEX: sp.BPINDEX, SPINDEX: sp.SPINDEX };
            }
        });
        
        getArray(proj.INTERNALPRODUCTION).forEach(part => {
            if (part.FILENAME && cabFilenames.has(part.FILENAME)) return; // Exclude Cabinets
            const snr = part.SNR_CAB || '';
            const cabInfo = snr ? cabBySNR[snr] : null;
            part._cabIdx  = cabInfo ? cabInfo.cabIdx : -1;
            part._cabDesc = cabInfo ? (cabInfo.cab.DESCRIPTION_CAB || '') : (window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t("type.nocab") : "NoCab Components");
            part._nocab   = !cabInfo;
            if (!cabInfo) part.SNR_CAB = "NoCAB";
            
            if (part.FILENAME && smallPartLookup[part.FILENAME]) {
                part.BPINDEX = smallPartLookup[part.FILENAME].BPINDEX;
                part.SPINDEX = smallPartLookup[part.FILENAME].SPINDEX;
            }
            
            flatData.push(part);
        });
    }

    function getPanelColumns() {
        let w = {};
        if (tableEl && tableEl.dataset.colWidths) {
            try { w = JSON.parse(tableEl.dataset.colWidths); } catch (e) {}
        }
        
        return [
            {
                title: window.AVL_LANG.t("th.cabsnr"),
                field: "SNR_CAB",
                sorter: "alphanum",
                width: w["SNR_CAB"] || undefined,
                formatter: function(cell) {
                    const row = cell.getRow().getData();
                    const snr = row.SNR_CAB || "";
                    const color = _panelCabColor(row._cabIdx ?? 0);
                    return `<span style="display:inline-flex;align-items:center;gap:5px;">${_panelCabDot(color)}<span>${snr}</span></span>`;
                }
            },
            {title: window.AVL_LANG.t("th.cablist"), field: "SNR_CABList", sorter: "alphanum", width: w["SNR_CABList"] || undefined},
            {
                title: window.AVL_LANG.t("th.desc"),
                titleDownload: window.AVL_LANG.t("th.desc"),
                field: "DESCRIPTION",
                titleFormatter: function() {
                    return window.AVL_LANG.t("th.desc") + '<br><span style="font-size: 0.85em; font-weight: normal; opacity: 0.85;">' + window.AVL_LANG.t("th.panelid") + '</span>';
                },
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const desc = data.DESCRIPTION || "";
                    const file = data.FILENAME || "";
                    if (!file) return `<strong>${desc}</strong>`;
                    return `<strong>${desc}</strong><div style="margin-top: 4px;"><span style="font-size: 0.85em; color: var(--color-text-placeholder);">${file}</span></div>`;
                }
            },
            {
                title: window.AVL_LANG.t("th.quantity"),
                field: "QTY",
                sorter: "number",
                hozAlign: "center",
                width: w["QTY"] || undefined,
                mutator: function(value, data) { return data.QTY || data.QUANTITY || 1; }
            },
            {
                title: window.AVL_LANG.t("th.matref"),
                field: "PAN_MATREF",
                width: w["PAN_MATREF"] || undefined,
                titleFormatter: function() {
                    return window.AVL_LANG.t("th.matref") + '<br><span style="font-size: 0.85em; font-weight: normal; opacity: 0.85;">' + window.AVL_LANG.t("th.matdesc") + '</span>';
                },
                formatter: function(cell) {
                    var data = cell.getRow().getData();
                    var matRef = data.PAN_MATREF || "";
                    var matDesc = data.PAN_MATDESC || "";
                    if (!matDesc || matDesc === matRef) return matRef;
                    return '<span>' + matRef + '</span><div style="margin-top: 4px;"><span style="font-size: 0.85em; color: var(--color-text-placeholder);">' + matDesc + '</span></div>';
                }
            },
            {
                title: window.AVL_LANG.t("th.length"),
                field: "PAN_LWEB",
                sorter: "number",
                hozAlign: "center",
                width: w["PAN_LWEB"] || undefined,
                titleFormatter: function() {
                    return window.AVL_LANG.t("th.length") + '<br><span style="font-size: 0.85em; font-weight: normal; opacity: 0.85;">' + window.AVL_LANG.t("th.rawlength") + '</span>';
                },
                formatter: function(cell) {
                    var data = cell.getRow().getData();
                    var val = data.PAN_LWEB || "";
                    var raw = data.PAN_STL || "";
                    var fmtVal = (window.AVL_UNITS && val !== '') ? window.AVL_UNITS.formatDim(val) : val;
                    var fmtRaw = (window.AVL_UNITS && raw !== '') ? window.AVL_UNITS.formatDim(raw) : raw;
                    if (!raw || raw === val) return fmtVal;
                    return '<span>' + fmtVal + '</span><div style="margin-top: 4px;"><span style="font-size: 0.85em; color: var(--color-text-placeholder);">' + fmtRaw + '</span></div>';
                }
            },
            {
                title: window.AVL_LANG.t("th.width"),
                field: "PAN_WWEB",
                sorter: "number",
                hozAlign: "center",
                width: w["PAN_WWEB"] || undefined,
                titleFormatter: function() {
                    return window.AVL_LANG.t("th.width") + '<br><span style="font-size: 0.85em; font-weight: normal; opacity: 0.85;">' + window.AVL_LANG.t("th.rawwidth") + '</span>';
                },
                formatter: function(cell) {
                    var data = cell.getRow().getData();
                    var val = data.PAN_WWEB || "";
                    var raw = data.PAN_STW || "";
                    var fmtVal = (window.AVL_UNITS && val !== '') ? window.AVL_UNITS.formatDim(val) : val;
                    var fmtRaw = (window.AVL_UNITS && raw !== '') ? window.AVL_UNITS.formatDim(raw) : raw;
                    if (!raw || raw === val) return fmtVal;
                    return '<span>' + fmtVal + '</span><div style="margin-top: 4px;"><span style="font-size: 0.85em; color: var(--color-text-placeholder);">' + fmtRaw + '</span></div>';
                }
            },
            {
                title: window.AVL_LANG.t("th.thickness"),
                field: "PAN_TWL",
                sorter: "number",
                hozAlign: "center",
                width: w["PAN_TWL"] || undefined,
                titleFormatter: function() {
                    return window.AVL_LANG.t("th.thickness") + '<br><span style="font-size: 0.85em; font-weight: normal; opacity: 0.85;">' + window.AVL_LANG.t("th.rawthickness") + '</span>';
                },
                formatter: function(cell) {
                    var data = cell.getRow().getData();
                    var val = data.PAN_TWL || "";
                    var raw = data.PAN_STT || "";
                    var fmtVal = (window.AVL_UNITS && val !== '') ? window.AVL_UNITS.formatDim(val) : val;
                    var fmtRaw = (window.AVL_UNITS && raw !== '') ? window.AVL_UNITS.formatDim(raw) : raw;
                    if (!raw || raw === val) return fmtVal;
                    return '<span>' + fmtVal + '</span><div style="margin-top: 4px;"><span style="font-size: 0.85em; color: var(--color-text-placeholder);">' + fmtRaw + '</span></div>';
                }
            },
            {
                title: window.AVL_LANG.t("th.edges"),
                field: "PAN_EBCOUNT",
                width: w["PAN_EBCOUNT"] || 60,
                minWidth: 50,
                hozAlign: "center",
                vertAlign: "middle",
                headerSort: true,
                sorter: "number",
                cssClass: "edge-icon-cell",
                formatter: function(cell) {
                    var data = cell.getRow().getData();
                    var hasL = !!(data.PAN_EBL_NAME && data.PAN_EBL_NAME.trim());
                    var hasR = !!(data.PAN_EBR_NAME && data.PAN_EBR_NAME.trim());
                    var hasF = !!(data.PAN_EBF_NAME && data.PAN_EBF_NAME.trim());
                    var hasB = !!(data.PAN_EBB_NAME && data.PAN_EBB_NAME.trim());

                    if (!data.PAN_EBCOUNT && data.PAN_EBCOUNT !== "0" && data.PAN_EBCOUNT !== 0) return "";
                    var s = 24, p = 2;
                    function edge(x1, y1, x2, y2, active) {
                        return active
                            ? '<line class="solid-edge" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke-width="2.5" stroke-linecap="round" stroke="currentColor"/>'
                            : '<line class="dashed-edge" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 2" stroke-linecap="round" opacity="0.35"/>';
                    }
                    return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 '+s+' '+s+'" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:auto;">'
                        + edge(p, p, s-p, p, hasB) + edge(p, s-p, s-p, s-p, hasF) + edge(p, p, p, s-p, hasL) + edge(s-p, p, s-p, s-p, hasR)
                        + '</svg>';
                }
            },
            {
                title: window.AVL_LANG.t("th.edgeinfo"),
                field: "PAN_EBB_MATREF",
                width: w["PAN_EBB_MATREF"] || 115,
                headerSort: false,
                formatter: function(cell) {
                    var d = cell.getRow().getData();
                    var tl = window.AVL_LANG.t;
                    var blue = 'color:var(--color-text-placeholder);min-width:1.3em;display:inline-block;font-style:normal;';
                    var muted = 'opacity:0.35;';
                    function row(label, val) {
                        var hasVal = val && val.trim();
                        return '<div style="' + (hasVal ? '' : muted) + 'font-size:0.82em;line-height:1.65;">'
                            + '<span style="' + blue + '">' + label + '</span> '
                            + (hasVal ? val.trim() : '—')
                            + '</div>';
                    }
                    return row(tl("ui.edges.f"), d.PAN_EBF_MATREF)
                         + row(tl("ui.edges.b"), d.PAN_EBB_MATREF)
                         + row(tl("ui.edges.l"), d.PAN_EBL_MATREF)
                         + row(tl("ui.edges.r"), d.PAN_EBR_MATREF);
                }
            },
            {
                title: window.AVL_LANG.t("th.belaginfo"),
                field: "PAN_LAMBOT_MATREF",
                width: w["PAN_LAMBOT_MATREF"] || 115,
                headerSort: false,
                formatter: function(cell) {
                    var d = cell.getRow().getData();
                    var tl = window.AVL_LANG.t;
                    var blue = 'color:var(--color-text-placeholder);min-width:1.3em;display:inline-block;font-style:normal;';
                    var muted = 'opacity:0.35;';
                    function row(label, val) {
                        var hasVal = val && val.trim();
                        return '<div style="' + (hasVal ? '' : muted) + 'font-size:0.82em;line-height:1.65;">'
                            + '<span style="' + blue + '">' + label + '</span> '
                            + (hasVal ? val.trim() : '—')
                            + '</div>';
                    }
                    return row(tl("ui.lam.o"), d.PAN_LAMTOP_MATREF)
                         + row(tl("ui.lam.u"), d.PAN_LAMBOT_MATREF);
                }
            },
            {
                title: window.AVL_LANG.t("ui.cnc"),
                field: "PROGCOUNT",
                width: w["PROGCOUNT"] || 50,
                minWidth: 40,
                hozAlign: "center",
                vertAlign: "middle",
                headerSort: true,
                sorter: "number",
                formatter: function(cell) {
                    var d = cell.getRow().getData();
                    var namedProgs = Array.isArray(d.PROGRAMS)
                        ? d.PROGRAMS.filter(function(p) { return p.PROG_FILENAME && p.PROG_FILENAME.trim(); })
                        : [];
                    var count = namedProgs.length;
                    var dot = '<svg width="10" height="10" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">'
                            + '<circle cx="5" cy="5" r="4" fill="var(--color-active-primary)"/>'
                            + '</svg>';
                    if (count >= 2) {
                        return '<span style="display:inline-flex;gap:3px;align-items:center;justify-content:center;">' + dot.repeat(count > 2 ? 3 : 2) + '</span>';
                    } else if (count === 1) {
                        return '<span style="display:inline-flex;align-items:center;justify-content:center;">' + dot + '</span>';
                    } else {
                        return '<span style="color:var(--color-text-primary);opacity:0.55;font-size:1.1em;line-height:1;">&#8722;</span>';
                    }
                }
            },
            {
                title: window.AVL_LANG.t("th.comment"),
                field: "COMMENT",
                width: w["COMMENT"] || undefined,
                headerSort: false,
                formatter: function(cell) {
                    var val = cell.getValue();
                    if (!val || !val.trim()) return '<span style="opacity:0.25;">—</span>';
                    return '<span style="font-style:italic;font-size:0.88em;">' + val.trim() + '</span>';
                }
            }
        ];
    }

    if (typeof Tabulator !== 'undefined' && Tabulator.findTable) {
        const existing = Tabulator.findTable(tableEl);
        if (existing && existing.length > 0) existing[0].destroy();
    }

    const table = new Tabulator(tableEl, {
        data: flatData,
        layout: "fitColumns",
        height: "100%",
        responsiveLayout: "collapse",
        groupBy: false,
        initialSort: [
            { column: "SNR_CABList", dir: "asc" },
            { column: "SNR_CAB", dir: "asc" }
        ],
        columnDefaults: { tooltip: true },
        columns: getPanelColumns()
    });

    window.addEventListener("avl:langChanged", () => {
        table.setColumns(getPanelColumns());
        updateItemCount();
    });

    const searchInput = viewSec.querySelector('#global-search') || document.getElementById("global-search");
    if (searchInput) {
        searchInput.addEventListener("input", function(e) {
            let value = e.target.value.toLowerCase();
            table.setFilter(function(data) {
                return String(data.SNR_CAB || "").toLowerCase().includes(value) ||
                       String(data.SNR_CABList || "").toLowerCase().includes(value) ||
                       String(data.DESCRIPTION || "").toLowerCase().includes(value) ||
                       String(data.FILENAME || "").toLowerCase().includes(value) ||
                       String(data.PAN_MATREF || "").toLowerCase().includes(value) ||
                       String(data.PAN_LWEB || "").toLowerCase().includes(value) ||
                       String(data.PAN_WWEB || "").toLowerCase().includes(value) ||
                       String(data.PAN_TWL || "").toLowerCase().includes(value);
            });
        });
    }

    const groupBySelect = viewSec.querySelector('#group-by') || document.getElementById("group-by");
    if (groupBySelect) {
        groupBySelect.addEventListener("change", function(e) {
            const val = e.target.value;
            table.setGroupBy(val ? val : false);
        });
    }

    function updateItemCount() {
        const countDiv = viewSec.querySelector('#item-count-display') || document.getElementById("item-count-display");
        if (countDiv) {
            const activeCount = table.getData("active").length;
            countDiv.innerHTML = window.AVL_LANG.t("ui.totalitems", {count: activeCount});
        }
    }

    table.on("tableBuilt", updateItemCount);
    table.on("dataLoaded", updateItemCount);
    table.on("dataFiltered", updateItemCount);

    const exportBtn = viewSec.querySelector('#export-btn') || document.getElementById("export-btn");
    const exportMenu = viewSec.querySelector('#export-menu') || document.getElementById("export-menu");
    const exportCsv = viewSec.querySelector('#export-csv') || document.getElementById("export-csv");
    const exportXlsx = viewSec.querySelector('#export-xlsx') || document.getElementById("export-xlsx");

    if (exportBtn && exportMenu) {
        exportBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            exportMenu.classList.toggle("show");
            exportBtn.classList.toggle("active");
        });

        document.addEventListener("click", function() {
            if (exportMenu.classList.contains("show")) {
                exportMenu.classList.remove("show");
                exportBtn.classList.remove("active");
            }
        });

        if (exportCsv) {
            exportCsv.addEventListener("click", function() {
                table.download("csv", "Panel_Report.csv", {delimiter: window.AVL_CSV ? window.AVL_CSV.getDelimiter() : ";"});
            });
        }

        if (exportXlsx) {
            exportXlsx.addEventListener("click", function() {
                table.download("xlsx", "Panel_Report.xlsx", {sheetName:"Panels Data"});
            });
        }
    }

    const printAllBtn = viewSec.querySelector('#print-all-lbl-btn') || document.getElementById("print-all-lbl-btn");
    if (printAllBtn) {
        printAllBtn.addEventListener("click", function() {
            const activeRows = table ? table.getData("active") : flatData;
            if (!activeRows || !activeRows.length) {
                alert(window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t("ui.nopartstoprint") : "No parts to print.");
                return;
            }
            if (typeof window.generatePDFLabels === 'function') {
                window.generatePDFLabels(activeRows, "Panel_Labels.pdf");
            } else {
                alert("Label printing engine is not initialized.");
            }
        });
    }

    table.on("rowClick", function(e, row) {
        if (typeof window.openPanelModal === "function") {
            window.openPanelModal(row);
        } else if (typeof openPanelModal === "function") {
            openPanelModal(row);
        }
    });

    window.addEventListener('avl:unitChanged', function() {
        if (typeof table !== 'undefined' && table) {
            table.setColumns(getPanelColumns());
        }
    });
}
document.addEventListener("DOMContentLoaded", initPanelTable);
window.addEventListener("avl:viewChanged", function(e) {
    if (e.detail && e.detail.view === 'panels') initPanelTable();
});
