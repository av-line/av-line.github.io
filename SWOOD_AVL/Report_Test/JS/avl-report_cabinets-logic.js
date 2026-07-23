// ── Cabinet colour palette (mirrors cutting.js) ──────────────────────────────
const _CAB_COLORS = [
    'var(--color-cab-0)','var(--color-cab-1)','var(--color-cab-2)','var(--color-cab-3)','var(--color-cab-4)',
    'var(--color-cab-5)','var(--color-cab-6)','var(--color-cab-7)','var(--color-cab-8)','var(--color-cab-9)',
    'var(--color-cab-10)','var(--color-cab-11)','var(--color-cab-12)','var(--color-cab-13)','var(--color-cab-14)'
];
function _cabColor(idx) {
    if (idx === null || idx === undefined || idx < 0) return 'var(--color-cab-nocab)';
    return _CAB_COLORS[idx % _CAB_COLORS.length];
}
function _cabDot(color, size) {
    const s = size || 10;
    return `<span style="display:inline-block;width:${s}px;height:${s}px;border-radius:2px;background:${color};flex-shrink:0;"></span>`;
}

function initCabinetsLogic() {
    const viewSec = document.getElementById('view-cabinets') || document;
    const tableEl = viewSec.querySelector('#cabinets-table') || document.getElementById('cabinets-table');
    if (!tableEl) return;
    if (tableEl.classList.contains('tabulator') && tableEl.children.length > 0) return;

    const proj = (typeof reportData !== 'undefined' && reportData) ? reportData.Project : null;
    if (proj) {
        if (document.getElementById('foot-cus')) document.getElementById('foot-cus').innerText = proj.CUS_NAME || '';
        if (document.getElementById('foot-projnr')) document.getElementById('foot-projnr').innerText = proj.PRJ_NR || '';
        if (document.getElementById('foot-eng')) document.getElementById('foot-eng').innerText = proj.ENGINEER || '';
        if (document.getElementById('foot-projname')) document.getElementById('foot-projname').innerText = proj.PRJ_NAME || '';
        if (document.getElementById('foot-projpos')) document.getElementById('foot-projpos').innerText = proj.PRJ_POSITION || '';
        if (document.getElementById('foot-report')) document.getElementById('foot-report').innerText = (proj.REPORT_TYPE || '') + " | " + (proj.REPORT_VERSION || '');
    }

    // 2. Prepare Data
    const getArray = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'object') return [v];
        return [];
    };
    const cabinetsRaw = (proj && proj.CABINET) ? getArray(proj.CABINET) : [];
    const cabinetsData = [...cabinetsRaw];
    
    // Sort cabinets by SNR_CAB before assigning color indices
    cabinetsData.sort((a, b) => {
        const valA = a.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (a.SNR_CAB || 'No CAB');
        const valB = b.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (b.SNR_CAB || 'No CAB');
        return String(valA).localeCompare(String(valB), undefined, { numeric: true });
    });
    
    cabinetsData.forEach((cab, i) => { cab._cabIdx = i; });

    // ── Project-level lookup maps (new structure) ─────────────────────────────
    const intProdMap  = {};
    const extProdMap  = {};
    const fittingsMap = {};
    if (proj) {
        getArray(proj.INTERNALPRODUCTION).forEach(p => { if(p.FILENAME) intProdMap[p.FILENAME]  = p; });
        getArray(proj.EXTERNALPRODUCTION).forEach(p => { if(p.FILENAME) extProdMap[p.FILENAME]  = p; });
        [...getArray(proj.FITTING), ...getArray(proj.FITTING_EFICAD)].forEach(f => { if(f.FILENAME) fittingsMap[f.FILENAME] = f; });
    }

    // ── Build No CAB fake cabinet for orphan components ──────────────────────
    const usedIntProds = new Set();
    const usedExtProds = new Set();
    const usedFittings = new Set();
    cabinetsData.forEach(cab => {
        getArray(cab.INTERNALPRODUCTION_PER_CAB).forEach(ref => usedIntProds.add(ref.FILENAME));
        getArray(cab.EXTERNALPRODUCTION_PER_CAB).forEach(ref => usedExtProds.add(ref.FILENAME));
        [...getArray(cab.FITTING_PER_CAB), ...getArray(cab.FITTING_EFICAD_PER_CAB)].forEach(ref => usedFittings.add(ref.FILENAME));
    });

    const cabFilenames = new Set(cabinetsData.map(c => c.FILENAME).filter(Boolean));
    const noCabInt = proj ? getArray(proj.INTERNALPRODUCTION).filter(p => !usedIntProds.has(p.FILENAME) && !cabFilenames.has(p.FILENAME)).map(p => ({FILENAME: p.FILENAME, QUANTITY: p.QTY || p.QUANTITY || "1"})) : [];
    const noCabExt = proj ? getArray(proj.EXTERNALPRODUCTION).filter(p => !usedExtProds.has(p.FILENAME)).map(p => ({FILENAME: p.FILENAME, QUANTITY: p.QTY || p.QUANTITY || "1"})) : [];
    const noCabFit = proj ? [...getArray(proj.FITTING), ...getArray(proj.FITTING_EFICAD)].filter(f => !usedFittings.has(f.FILENAME)).map(f => ({FILENAME: f.FILENAME, QUANTITY: f.QTY || f.QUANTITY || "1"})) : [];

    if (noCabInt.length > 0 || noCabExt.length > 0 || noCabFit.length > 0) {
        cabinetsData.push({
            _cabIdx: -1,
            SNR_CAB: "",
            DESCRIPTION_CAB: window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t("type.nocab") : "NoCab Components",
            INTERNALPRODUCTION_PER_CAB: noCabInt,
            EXTERNALPRODUCTION_PER_CAB: noCabExt,
            FITTING_PER_CAB: noCabFit,
            QTY: "1"
        });
    }
    let cabinetsTable;
    let currentCabinetData = null; // Track current cabinet for default details

    const updateMasterCount = () => {
        const d = document.getElementById('item-count-display');
        if (d) {
            const c = cabinetsTable ? cabinetsTable.getData("active").length : cabinetsData.length;
            d.innerHTML = window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t("ui.totalitems", {count: c}) : `Total: ${c} items`;
        }
    };

    // 3. Initialize Cabinets Base Table
    const getCabinetColumns = () => {
        let w = {};
        const el = document.getElementById("cabinets-table");
        if (el && el.dataset.colWidths) { try { w = JSON.parse(el.dataset.colWidths); } catch(e) {} }
        
        const imgPath = window.AVL_OFFLINE_MODE ? '_SOURCE/IMG/Cabs/' : '../IMG/Cabs/';

        return [
        {
            title: window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t("th.cabsnr") : "SNR_CAB",
            field: "SNR_CAB",
            width: w["SNR_CAB"] || 110,
            sorter: (a, b) => {
                if (a === b) return 0;
                if (a === "") return 1;
                if (b === "") return -1;
                return String(a).localeCompare(String(b), undefined, { numeric: true });
            },
            formatter: (cell) => {
                const row = cell.getRow().getData();
                const snr = row.SNR_CAB || "";
                const color = _cabColor(row._cabIdx ?? 0);
                return `<span style="display:inline-flex;align-items:center;gap:6px;">${_cabDot(color)}<span>${snr}</span></span>`;
            }
        },
        {
            title: window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t("th.desc") : "Description",
            field: "DESCRIPTION_CAB",
            width: w["DESCRIPTION_CAB"] || undefined,
            formatter: (cell) => {
                const row = cell.getRow().getData();
                const desc = row.DESCRIPTION_CAB || "";
                const fn = row.FILENAME || "";
                return `<strong>${desc}</strong><br/><span style="color:var(--color-text-placeholder); font-size: 0.85em;">${fn}</span>`;
            }
        },
        { title: window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t("th.quantity") : "Qty", field: "QTY", width: w["QTY"] || 80, hozAlign: "center" },
        {
            title: window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t("th.thumbnail") : "Thumbnail",
            field: "FILENAME",
            width: w["FILENAME"] || 320,
            hozAlign: "center",
            headerSort: false,
            formatter: (cell) => {
                const fn = cell.getValue();
                if (!fn) return "";
                return `<img src="${imgPath}${fn}_CAB.jpg" style="max-height:140px; margin-top:5px; border-radius:4px;" onerror="this.style.display='none'" />`;
            }
        },
        { title: window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t("th.comment") : "Comment", field: "COMMENT_CAB", width: w["COMMENT_CAB"] || undefined }
    ];
    };

    const cabContainer = document.getElementById("cabinets-table");
    if (cabContainer) {
        if (typeof Tabulator !== 'undefined' && Tabulator.findTable) {
            const existing = Tabulator.findTable("#cabinets-table");
            if (existing && existing.length > 0) existing[0].destroy();
        }

        cabinetsTable = new Tabulator("#cabinets-table", {
            data: cabinetsData,
            layout: "fitColumns",
            responsiveLayout: "collapse",
            rowHeight: 160,
            initialSort: [
                { column: "SNR_CAB", dir: "asc" },
            ],
            columns: getCabinetColumns()
        });

        window.addEventListener("avl:langChanged", () => {
            if (cabinetsTable) cabinetsTable.setColumns(getCabinetColumns());
            updateMasterCount();
        });

        cabinetsTable.on("tableBuilt", updateMasterCount);
        cabinetsTable.on("dataLoaded", updateMasterCount);
        cabinetsTable.on("dataFiltered", updateMasterCount);
    }

    // 4. Search Filter
    const searchInput = document.getElementById("global-search");
    if (searchInput && cabinetsTable) {
        searchInput.addEventListener("input", function () {
            const val = this.value;
            cabinetsTable.setFilter([
                [
                    { field: "SNR_CAB", type: "like", value: val },
                    { field: "DESCRIPTION_CAB", type: "like", value: val },
                    { field: "FILENAME", type: "like", value: val },
                    { field: "COMMENT_CAB", type: "like", value: val }
                ]
            ]);
        });
    }

    // 5. Master/Detail Logic (Scoped to view-cabinets container to prevent offline ID collision)
    const secEl = document.getElementById('view-cabinets') || document;
    let componentsTable = null;
    let isSyncing = false; // Flag to prevent recursion
    const masterView = secEl.querySelector('#master-view') || document.getElementById('master-view');
    const detailView = secEl.querySelector('#detail-view') || document.getElementById('detail-view');
    const closeBtn = secEl.querySelector('#close-detail-btn') || document.getElementById('close-detail-btn');
    const thumbImg = secEl.querySelector('#thumb-img') || secEl.querySelector('#detail-thumbnail-img') || document.getElementById('thumb-img');

    // Panel Details Logic (Supports Cabinet & Component views)
    const updatePanelDetails = (data) => {
        const cabGroup = document.getElementById('cabinet-info-group');
        const compGroup = document.getElementById('component-info-group') || document.getElementById('panel-info-group');
        const fitGroup = document.getElementById('fitting-info-group');
        const header = document.getElementById('details-header');
        if (!cabGroup || !compGroup || !header) return;

        const t = (...args) => window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t(...args) : args[0];

        // Hide all groups first
        cabGroup.style.display = 'none';
        compGroup.style.display = 'none';
        if (fitGroup) fitGroup.style.display = 'none';

        if (!data) {
            // SHOW CABINET INFO (Nothing selected in components table)
            header.innerText = t("ui.cabinfo") || "Cabinet Info";
            if (currentCabinetData) {
                if (document.getElementById('cab-detail-snr')) document.getElementById('cab-detail-snr').innerText = currentCabinetData.SNR_CAB || '-';
                if (document.getElementById('cab-detail-desc')) document.getElementById('cab-detail-desc').innerText = currentCabinetData.DESCRIPTION_CAB || '-';
                if (document.getElementById('cab-detail-qty')) document.getElementById('cab-detail-qty').innerText = currentCabinetData.QTY || '-';
                if (document.getElementById('cab-detail-file')) document.getElementById('cab-detail-file').innerText = currentCabinetData.FILENAME || '-';
                if (document.getElementById('cab-detail-comment')) document.getElementById('cab-detail-comment').innerText = currentCabinetData.COMMENT_CAB || '-';
            }
            cabGroup.style.display = 'flex';
            if (thumbImg) thumbImg.src = window.AVL_OFFLINE_MODE ? `_SOURCE/IMG/Cabs/${currentCabinetData ? currentCabinetData.FILENAME : ''}_CAB.jpg` : `../IMG/Cabs/${currentCabinetData ? currentCabinetData.FILENAME : ''}_CAB.jpg`;
            return;
        }

        // SHOW COMPONENT INFO (Component selected)
        header.innerText = t("ui.partinfo") || "Part Info";
        if (document.getElementById('panel-detail-mat')) document.getElementById('panel-detail-mat').innerText = data.PAN_MATREF || '-';
        if (document.getElementById('panel-detail-grain')) document.getElementById('panel-detail-grain').innerText = data.PAN_GRAIN || '-';
        if (document.getElementById('panel-detail-edges')) document.getElementById('panel-detail-edges').innerText = data.PAN_EBCOUNT || '-';

        compGroup.style.display = 'flex';
        const imgFolder = window.AVL_OFFLINE_MODE ? '_SOURCE/IMG/' : '../IMG/';
        if (thumbImg) {
            if (data._type === 'FITTING') thumbImg.src = `${imgFolder}Fittings/${data.FILENAME}_Fitting.jpg`;
            else thumbImg.src = `${imgFolder}Labels/${data.FILENAME}_Label.jpg`;
        }
    };

    const openDetail = (cabData) => {
        currentCabinetData = cabData;
        if (masterView) masterView.style.display = 'none';
        if (detailView) detailView.style.display = 'flex';

        const titleEl = document.getElementById('detail-title');
        if (titleEl) {
            const snr = cabData.SNR_CAB || '';
            const desc = cabData.DESCRIPTION_CAB || '';
            titleEl.innerText = snr ? `${snr} - ${desc}` : desc;
        }

        // Load 3D model
        if (window.load3DModelForCabinet) {
            window.load3DModelForCabinet(cabData.FILENAME);
        }

        // Set initial Panel Details to Cabinet Info
        updatePanelDetails(null);

        // Build Flattened Components List
        const allComp = [];

        getArray(cabData.INTERNALPRODUCTION_PER_CAB).forEach(ref => {
            const base = intProdMap[ref.FILENAME] || {};
            allComp.push({
                ...base,
                QTY: ref.QUANTITY || base.QTY || "1",
                FILENAME: ref.FILENAME,
                DESCRIPTION: base.DESCRIPTION || ref.FILENAME,
                _type: "INTERNALPRODUCTION",
                typeSort: 1
            });
        });

        getArray(cabData.EXTERNALPRODUCTION_PER_CAB).forEach(ref => {
            const base = extProdMap[ref.FILENAME] || {};
            allComp.push({
                ...base,
                QTY: ref.QUANTITY || base.QTY || "1",
                FILENAME: ref.FILENAME,
                DESCRIPTION: base.DESCRIPTION || ref.FILENAME,
                _type: "EXTERNALPRODUCTION",
                typeSort: 2
            });
        });

        [...getArray(cabData.FITTING_PER_CAB), ...getArray(cabData.FITTING_EFICAD_PER_CAB)].forEach(ref => {
            const base = fittingsMap[ref.FILENAME] || {};
            allComp.push({
                ...base,
                QTY: ref.QUANTITY || base.QTY || "1",
                FILENAME: ref.FILENAME,
                DESCRIPTION: base.DESCRIPTION || ref.FILENAME,
                _type: "FITTING",
                typeSort: 3
            });
        });

        const getComponentColumns = () => {
            let w = {};
            const el = document.getElementById("detail-components-table");
            if (el && el.dataset.colWidths) { try { w = JSON.parse(el.dataset.colWidths); } catch(e) {} }
            const t = (...args) => window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t(...args) : args[0];

            return [
                {
                    title: t("th.desc"),
                    field: "DESCRIPTION",
                    width: w["DESCRIPTION"] || undefined,
                    formatter: (cell) => {
                        const row = cell.getRow().getData();
                        return `<strong>${row.DESCRIPTION || ''}</strong><br/><span class="component-filename" style="font-size: 0.85em;">${row.FILENAME || ''}</span>`;
                    }
                },
                { title: t("th.quantity"), field: "QTY", width: w["QTY"] || 60, hozAlign: "center" },
                { title: t("th.matref"), field: "PAN_MATREF", width: w["PAN_MATREF"] || 120 },
                {
                    title: t("th.length"),
                    field: "PAN_LWEB",
                    width: w["PAN_LWEB"] || 80,
                    hozAlign: "center",
                    formatter: (cell) => {
                        const data = cell.getRow().getData();
                        const val = data.PAN_LWEB || "";
                        const raw = data.PAN_STL || "";
                        const fmtVal = (window.AVL_UNITS && val !== '') ? window.AVL_UNITS.formatDim(val) : val;
                        const fmtRaw = (window.AVL_UNITS && raw !== '') ? window.AVL_UNITS.formatDim(raw) : raw;
                        if (!raw || raw === val) return fmtVal;
                        return `<span>${fmtVal}</span><div style="margin-top: 4px;"><span class="raw-dimension" style="font-size: 0.85em;">${fmtRaw}</span></div>`;
                    }
                },
                {
                    title: t("th.width"),
                    field: "PAN_WWEB",
                    width: w["PAN_WWEB"] || 80,
                    hozAlign: "center",
                    formatter: (cell) => {
                        const data = cell.getRow().getData();
                        const val = data.PAN_WWEB || "";
                        const raw = data.PAN_STW || "";
                        const fmtVal = (window.AVL_UNITS && val !== '') ? window.AVL_UNITS.formatDim(val) : val;
                        const fmtRaw = (window.AVL_UNITS && raw !== '') ? window.AVL_UNITS.formatDim(raw) : raw;
                        if (!raw || raw === val) return fmtVal;
                        return `<span>${fmtVal}</span><div style="margin-top: 4px;"><span class="raw-dimension" style="font-size: 0.85em;">${fmtRaw}</span></div>`;
                    }
                },
                {
                    title: t("th.thickness"),
                    field: "PAN_TWL",
                    width: w["PAN_TWL"] || 70,
                    hozAlign: "center",
                    formatter: (cell) => {
                        const data = cell.getRow().getData();
                        const val = data.PAN_TWL || "";
                        const raw = data.PAN_STT || "";
                        const fmtVal = (window.AVL_UNITS && val !== '') ? window.AVL_UNITS.formatDim(val) : val;
                        const fmtRaw = (window.AVL_UNITS && raw !== '') ? window.AVL_UNITS.formatDim(raw) : raw;
                        if (!raw || raw === val) return fmtVal;
                        return `<span>${fmtVal}</span><div style="margin-top: 4px;"><span class="raw-dimension" style="font-size: 0.85em;">${fmtRaw}</span></div>`;
                    }
                }
            ];
        };

        const compContainer = document.getElementById("detail-components-table");
        if (compContainer) {
            if (typeof Tabulator !== 'undefined' && Tabulator.findTable) {
                const existingComp = Tabulator.findTable("#detail-components-table");
                if (existingComp && existingComp.length > 0) existingComp[0].destroy();
            }

            componentsTable = new Tabulator("#detail-components-table", {
                data: allComp,
                layout: "fitColumns",
                groupBy: (data) => data.typeSort,
                groupHeader: (value) => {
                    const typeMap = { 1: "INTERNALPRODUCTION", 2: "EXTERNALPRODUCTION", 3: "FITTING" };
                    const typeKey = typeMap[value] || value;
                    return window.AVL_LANG && window.AVL_LANG.t ? window.AVL_LANG.t("type." + typeKey) : typeKey;
                },
                selectableRows: 1,
                columns: getComponentColumns()
            });

            componentsTable.on("rowSelectionChanged", (data, rows) => {
                if (isSyncing) return;
                isSyncing = true;
                if (rows.length > 0) {
                    const cdata = rows[0].getData();
                    if (window.highlightComponentByName) window.highlightComponentByName(cdata.FILENAME);
                    updatePanelDetails(cdata);
                } else {
                    if (window.highlightComponentByName) window.highlightComponentByName("");
                    updatePanelDetails(null);
                }
                isSyncing = false;
            });
        }
    };

    if (cabinetsTable) {
        cabinetsTable.on("rowClick", (e, row) => {
            openDetail(row.getData());
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (detailView) detailView.style.display = 'none';
            if (masterView) masterView.style.display = 'flex';
        });
    }
}
document.addEventListener("DOMContentLoaded", initCabinetsLogic);
window.addEventListener("avl:viewChanged", function(e) {
    if (e.detail && e.detail.view === 'cabinets') initCabinetsLogic();
});
