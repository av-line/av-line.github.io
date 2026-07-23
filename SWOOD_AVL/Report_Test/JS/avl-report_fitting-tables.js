function initFittingTables() {
    let fittingTable;
    let lvTable;
    let rawData = [];
    let lvRawData = [];

    const viewSec = document.getElementById('view-fittings') || document;
    const tableEl = viewSec.querySelector('#data-table') || document.getElementById('fittings-table');
    if (!tableEl) return;
    if (tableEl.classList.contains('tabulator') && tableEl.children.length > 0) return;

    if (typeof reportData !== 'undefined' && reportData && reportData.Project) {
        const proj = reportData.Project;
        const getArray = (v) => {
            if (!v) return [];
            if (Array.isArray(v)) return v;
            if (typeof v === 'object') return [v];
            return [];
        };
        rawData = [
            ...getArray(proj.FITTING),
            ...getArray(proj.FITTING_EFICAD)
        ];
        lvRawData = [
            ...getArray(proj.FITTING_LV)
        ];

        const setVal = (id, val) => {
            const el = viewSec.querySelector('#' + id) || document.getElementById(id);
            if (el) el.innerText = val || '';
        };
        setVal('foot-cus', proj.CUS_NAME);
        setVal('foot-projnr', proj.PRJ_NR);
        setVal('foot-eng', proj.ENGINEER);
        setVal('foot-projname', proj.PRJ_NAME);
        setVal('foot-projpos', proj.PRJ_POSITION);
        setVal('foot-report', (proj.REPORT_TYPE || '') + " | " + (proj.REPORT_VERSION || ''));
    }

    const summaryCb = viewSec.querySelector('#use-summary-cb') || document.getElementById("use-summary-cb");

    function getProcessedData(items) {
        if (summaryCb && summaryCb.checked) {
            const map = {};
            items.forEach(f => {
                const key = `${f.DESCRIPTION}_${f.DESCRIPTION_EXTENDED}_${f.SUPPLIER}_${f.SUPPLIERCODE}_${f.LENGTH || ''}`;
                if (!map[key]) {
                    map[key] = {
                        DESCRIPTION: f.DESCRIPTION,
                        DESCRIPTION_EXTENDED: f.DESCRIPTION_EXTENDED,
                        SUPPLIER: f.SUPPLIER,
                        SUPPLIERCODE: f.SUPPLIERCODE,
                        FILENAME: f.FILENAME || "",
                        WEBLINK: f.WEBLINK || "",
                        LENGTH: f.LENGTH || "",
                        _filenames: [],
                        QUANTITY: 0
                    };
                }
                if (f.FILENAME) map[key]._filenames.push(f.FILENAME);
                if (!map[key].WEBLINK && f.WEBLINK) map[key].WEBLINK = f.WEBLINK;
                const q = parseFloat(f.QUANTITY) || 0;
                map[key].QUANTITY += q;
            });
            return Object.values(map);
        } else {
            return items.map(f => Object.assign({ _filenames: f.FILENAME ? [f.FILENAME] : [] }, f));
        }
    }

    function getColumns(isLV) {
        const isSummarized = summaryCb ? summaryCb.checked : false;
        let w = {};
        const container = isLV ? (viewSec.querySelector('#data-table-lv') || document.getElementById("data-table-lv")) : tableEl;
        if (container && container.dataset.colWidths) {
            try { w = JSON.parse(container.dataset.colWidths); } catch (e) {}
        }

        const getWidthProps = (field, defaultGrow) => {
            const val = w[field];
            if (!val) return { widthGrow: defaultGrow };
            if (val.endsWith("%")) {
                const num = parseFloat(val);
                if (field === "THUMBNAIL") {
                    return { width: Math.max(55, Math.round(num * 10)) };
                }
                return { widthGrow: num };
            }
            return { width: parseInt(val) || undefined };
        };

        const imgFolder = window.AVL_OFFLINE_MODE ? '_SOURCE/IMG/' : '../IMG/';

        const cols = [
            Object.assign({
                title: window.AVL_LANG.t("th.thumbnail"),
                field: "_img",
                mutator: function(value, data) { return data.FILENAME || ""; },
                hozAlign: "center",
                vertAlign: "middle",
                headerSort: false,
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const filenames = (data._filenames && data._filenames.length)
                        ? data._filenames
                        : (data.FILENAME ? [data.FILENAME] : []);
                    if (!filenames.length) return '<span style="opacity:0.15;font-size:1.4em;line-height:62px;">&#9635;</span>';
                    const basePath = isLV ? `${imgFolder}Part/` : `${imgFolder}Fittings/`;
                    const suffix = isLV ? '_part.jpg' : '_Fitting.jpg';
                    const attemptsJson = JSON.stringify(filenames.map(fn => basePath + fn + suffix));
                    const firstSrc = basePath + filenames[0] + suffix;
                    return `<img data-attempts='${attemptsJson}' data-idx='0'
                        src="${firstSrc}"
                        style="max-height:54px;max-width:60px;object-fit:contain;display:block;margin:auto;"
                        onerror="(function(el){var a=JSON.parse(el.dataset.attempts),i=parseInt(el.dataset.idx)+1;if(i<a.length){el.dataset.idx=i;el.src=a[i];}else{el.style.display='none';}})(this)"
                    />`;
                },
                download: false
            }, getWidthProps("THUMBNAIL", 8)),
            Object.assign({
                title: window.AVL_LANG.t("th.desc"),
                titleDownload: window.AVL_LANG.t("th.desc"),
                field: "DESCRIPTION",
                titleFormatter: function() {
                    return `${window.AVL_LANG.t("th.desc")}<br><span style="font-size:0.85em;font-weight:normal;opacity:0.85;">${window.AVL_LANG.t("th.desc_ext")}</span>`;
                },
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const desc = data.DESCRIPTION || "";
                    const ext = data.DESCRIPTION_EXTENDED || "";
                    if (!ext) return `<strong>${desc}</strong>`;
                    return `<strong>${desc}</strong><div style="margin-top:4px;"><span style="font-size:0.85em;color:var(--color-text-placeholder);">${ext}</span></div>`;
                }
            }, getWidthProps("DESCRIPTION", 35)),
            Object.assign({
                title: window.AVL_LANG.t("th.supplier"),
                titleDownload: window.AVL_LANG.t("th.supplier"),
                field: "SUPPLIER",
                titleFormatter: function() {
                    return `${window.AVL_LANG.t("th.supplier")}<br><span style="font-size:0.85em;font-weight:normal;opacity:0.85;">${window.AVL_LANG.t("th.suppliercode")}</span>`;
                },
                formatter: function(cell) {
                    const data = cell.getRow().getData();
                    const sup = data.SUPPLIER || "";
                    const code = data.SUPPLIERCODE || "";
                    if (!code) return sup;
                    return `<span>${sup}</span><div style="margin-top:4px;"><span style="font-size:0.85em;color:var(--color-text-placeholder);">${code}</span></div>`;
                }
            }, getWidthProps("SUPPLIER", 20)),
            Object.assign({
                title: window.AVL_LANG.t("th.quantity"),
                field: "QUANTITY",
                sorter: "number",
                hozAlign: "center",
                formatter: function(cell) {
                    const v = cell.getValue();
                    return `<strong>${v}</strong>`;
                }
            }, getWidthProps("QUANTITY", 10)),
            Object.assign({
                title: window.AVL_LANG.t("th.weblink"),
                field: "WEBLINK",
                hozAlign: "center",
                headerSort: false,
                formatter: function(cell) {
                    const url = cell.getValue();
                    if (!url || !url.trim()) return '<span style="opacity:0.15;font-size:1.4em;">&#8722;</span>';
                    const fullUrl = (url.startsWith('http://') || url.startsWith('https://')) ? url : ('https://' + url);
                    return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--color-active-primary);text-decoration:none;display:inline-flex;align-items:center;justify-content:center;" title="${url}">
                        <span class="material-symbols-rounded" style="font-size:20px;">open_in_new</span>
                    </a>`;
                }
            }, getWidthProps("WEBLINK", 8))
        ];

        if (isLV) {
            cols.splice(4, 0, Object.assign({
                title: window.AVL_LANG.t("th.length"),
                field: "LENGTH",
                sorter: "number",
                hozAlign: "center",
                formatter: function(cell) {
                    const v = cell.getValue();
                    if (!v && v !== 0) return `<span style="opacity:0.25;">—</span>`;
                    return (window.AVL_UNITS && v !== '') ? window.AVL_UNITS.formatDim(v) : v;
                }
            }, getWidthProps("LENGTH", 10)));
        }

        return cols;
    }

    function renderTables() {
        const data = getProcessedData(rawData);
        const lvData = getProcessedData(lvRawData);
        const groupSelect = viewSec.querySelector('#group-by') || document.getElementById("group-by");
        const initialGroup = groupSelect ? groupSelect.value : false;
        
        const fittingsSection = viewSec.querySelector('#fittings-section') || document.getElementById("fittings-section");
        if (data.length > 0) {
            if (fittingsSection) fittingsSection.style.display = "block";
            
            if (typeof Tabulator !== 'undefined' && Tabulator.findTable) {
                const existing = Tabulator.findTable(tableEl);
                if (existing && existing.length > 0) existing[0].destroy();
            }

            fittingTable = new Tabulator(tableEl, {
                data: data,
                layout: "fitColumns",
                rowHeight: 72,
                responsiveLayout: "collapse",
                groupBy: initialGroup || false,
                columnDefaults: { tooltip: true },
                columns: getColumns(false)
            });

            fittingTable.on("tableBuilt", updateItemCount);
            fittingTable.on("dataLoaded", updateItemCount);
            fittingTable.on("dataFiltered", updateItemCount);
        } else {
            if (fittingsSection) fittingsSection.style.display = "none";
        }

        const fittingsLvSection = viewSec.querySelector('#fittings-lv-section') || document.getElementById("fittings-lv-section");
        const lvContainer = viewSec.querySelector('#data-table-lv') || document.getElementById("data-table-lv");

        if (lvData.length > 0 && lvContainer) {
            if (fittingsLvSection) fittingsLvSection.style.display = "block";
            
            if (typeof Tabulator !== 'undefined' && Tabulator.findTable) {
                const existingLv = Tabulator.findTable(lvContainer);
                if (existingLv && existingLv.length > 0) existingLv[0].destroy();
            }

            lvTable = new Tabulator(lvContainer, {
                data: lvData,
                layout: "fitColumns",
                rowHeight: 72,
                responsiveLayout: "collapse",
                groupBy: initialGroup || false,
                columnDefaults: { tooltip: true },
                columns: getColumns(true)
            });

            lvTable.on("tableBuilt", updateItemCount);
            lvTable.on("dataLoaded", updateItemCount);
            lvTable.on("dataFiltered", updateItemCount);
        } else {
            if (fittingsLvSection) fittingsLvSection.style.display = "none";
        }
        
        updateItemCount();
    }

    function updateItemCount() {
        const countDiv = viewSec.querySelector('#item-count-display') || document.getElementById("item-count-display");
        if (countDiv) {
            let activeCount = 0;
            if (fittingTable && rawData.length > 0) activeCount += fittingTable.getData("active").length;
            if (lvTable && lvRawData.length > 0) activeCount += lvTable.getData("active").length;
            countDiv.innerHTML = window.AVL_LANG.t("ui.totalitems", {count: activeCount});
        }
    }

    renderTables();

    if (summaryCb) {
        summaryCb.addEventListener("change", renderTables);
    }

    const searchInput = viewSec.querySelector('#global-search') || document.getElementById("global-search");
    if (searchInput) {
        searchInput.addEventListener("input", e => {
            const val = e.target.value.toLowerCase();
            const filterFn = data => {
                return String(data.DESCRIPTION || "").toLowerCase().includes(val) ||
                       String(data.DESCRIPTION_EXTENDED || "").toLowerCase().includes(val) ||
                       String(data.SUPPLIER || "").toLowerCase().includes(val) ||
                       String(data.SUPPLIERCODE || "").toLowerCase().includes(val);
            };
            if (fittingTable) fittingTable.setFilter(filterFn);
            if (lvTable) lvTable.setFilter(filterFn);
        });
    }

    const groupBySelect = viewSec.querySelector('#group-by') || document.getElementById("group-by");
    if (groupBySelect) {
        groupBySelect.addEventListener("change", e => {
            const val = e.target.value;
            if (fittingTable) fittingTable.setGroupBy(val ? val : false);
            if (lvTable) lvTable.setGroupBy(val ? val : false);
        });
    }

    window.addEventListener("avl:langChanged", () => {
        if (fittingTable) fittingTable.setColumns(getColumns(false));
        if (lvTable) lvTable.setColumns(getColumns(true));
        updateItemCount();
    });
}
document.addEventListener("DOMContentLoaded", initFittingTables);
window.addEventListener("avl:viewChanged", function(e) {
    if (e.detail && e.detail.view === 'fittings') initFittingTables();
});
