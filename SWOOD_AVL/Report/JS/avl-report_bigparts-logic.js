// Data processing and table initialization for BigParts Report
document.addEventListener("DOMContentLoaded", () => {

    // 1. Populate Footer Metadata
    const proj = (typeof reportData !== 'undefined' && reportData) ? reportData.Project : null;
    if (proj) {
        if (document.getElementById('foot-cus')) document.getElementById('foot-cus').innerText = proj.CUS_NAME || '';
        if (document.getElementById('foot-projnr')) document.getElementById('foot-projnr').innerText = proj.PRJ_NR || '';
        if (document.getElementById('foot-eng')) document.getElementById('foot-eng').innerText = proj.ENGINEER || '';
        if (document.getElementById('foot-projname')) document.getElementById('foot-projname').innerText = proj.PRJ_NAME || '';
        if (document.getElementById('foot-projpos')) document.getElementById('foot-projpos').innerText = proj.PRJ_POSITION || '';
        if (document.getElementById('foot-report')) document.getElementById('foot-report').innerText = (proj.REPORT_TYPE || '') + " | " + (proj.REPORT_VERSION || '');
    }

    // 2. Helper Functions
    const getArray = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'object') return [v];
        return [];
    };

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val !== undefined && val !== null ? val : '-';
    };

    // Extract BigPart assemblies list
    const allIntProds = proj ? getArray(proj.INTERNALPRODUCTION) : [];
    const bpaList = proj ? getArray(proj.BIGPART_ASSEMBLY) : [];
    const bpList = proj ? getArray(proj.BIGPART) : [];
    const spList = proj ? getArray(proj.SMALLPART) : [];

    const bigPartAssemblies = [];
    if (bpaList.length > 0) {
        bpaList.forEach(bpa => {
            const copy = { ...bpa };
            if (!copy.BPINDEX && copy.FILENAME) {
                const matchBp = bpList.find(b => b.FILENAME === copy.FILENAME);
                if (matchBp && matchBp.BPINDEX) copy.BPINDEX = matchBp.BPINDEX;
            }
            bigPartAssemblies.push(copy);
        });
    } else if (bpList.length > 0) {
        bpList.forEach(bp => {
            bigPartAssemblies.push({ ...bp });
        });
    } else {
        allIntProds.forEach(pan => {
            if (pan.BPINDEX || pan.TO_BIGPART) {
                bigPartAssemblies.push({ ...pan });
            }
        });
    }

    // Sort Assemblies by BPINDEX numeric
    bigPartAssemblies.sort((a, b) => {
        return String(a.BPINDEX || '').localeCompare(String(b.BPINDEX || ''), undefined, { numeric: true });
    });

    // 3. UI References (Scoped to view-bigparts container to prevent offline ID collision)
    const secEl = document.getElementById('view-bigparts') || document;
    const masterView = secEl.querySelector('#master-view') || document.getElementById('master-view');
    const detailView = secEl.querySelector('#detail-view') || document.getElementById('detail-view');
    const closeBtn = secEl.querySelector('#close-detail-btn') || document.getElementById('close-detail-btn');
    const thumbImg = secEl.querySelector('#thumb-img') || secEl.querySelector('#bp-label-img') || secEl.querySelector('#detail-thumbnail-img') || document.getElementById('thumb-img');

    let bigPartsTable;
    let smallPartsTable;
    let summaryTable;
    let currentAssemblyData = null;
    let currentDetailDataCount = 0;

    const t = (key, params) => (window.AVL_LANG && window.AVL_LANG.t) ? window.AVL_LANG.t(key, params) : key;

    // ── Update Details Panel (Supports BigPart & SmallPart views) ────────────────
    const updatePanelDetails = (data) => {
        const bpGroup = secEl.querySelector('#bigpart-info-group') || document.getElementById('bigpart-info-group');
        const compGroup = secEl.querySelector('#component-info-group') || document.getElementById('component-info-group');
        const header = secEl.querySelector('#details-header') || document.getElementById('details-header');
        const imgFolder = window.AVL_OFFLINE_MODE ? '_SOURCE/IMG/' : '../IMG/';

        const setSecText = (id, val) => {
            const el = secEl.querySelector('#' + id) || document.getElementById(id);
            if (el) el.innerText = val !== undefined && val !== null ? val : '-';
        };

        if (bpGroup) bpGroup.style.display = 'none';
        if (compGroup) compGroup.style.display = 'none';

        if (!data) {
            // SHOW BIGPART INFO (Default)
            if (bpGroup) bpGroup.style.display = 'flex';
            if (header) header.innerText = t("th.bp_info") || "Big Part Info";
            
            if (currentAssemblyData) {
                setSecText('bp-detail-bpindex', currentAssemblyData.BPINDEX || '-');
                setSecText('bp-detail-desc', currentAssemblyData.DESCRIPTION || '-');
                setSecText('bp-detail-qty', currentAssemblyData.QUANTITY || '1');
                setSecText('bp-detail-file', currentAssemblyData.FILENAME || '-');
                setSecText('bp-detail-comment', currentAssemblyData.COMMENT || '-');
                if (thumbImg) thumbImg.src = `${imgFolder}BPASM/${currentAssemblyData.FILENAME}_BPASM.jpg`;
            }
            return;
        }

        // SHOW COMPONENT INFO (Production Parts / SmallParts)
        if (compGroup) compGroup.style.display = 'flex';
        if (header) header.innerText = t("ui.compinfo") || "Component Info";

        // Edges
        setSecText('detail-eb-l', data.PAN_EBL_MATREF || '-');
        setSecText('detail-eb-r', data.PAN_EBR_MATREF || '-');
        setSecText('detail-eb-f', data.PAN_EBF_MATREF || '-');
        setSecText('detail-eb-b', data.PAN_EBB_MATREF || '-');

        // Laminate
        setSecText('detail-lam-o', data.PAN_LAMTOP_MATREF || '-');
        setSecText('detail-lam-u', data.PAN_LAMBOT_MATREF || '-');

        // CNC
        let cncA = '-', cncB = '-';
        if (data.PROGRAMS && Array.isArray(data.PROGRAMS)) {
            data.PROGRAMS.forEach(p => {
                if (p.PROG_PHASENAME === 'A') cncA = p.PROG_FILENAME || '-';
                if (p.PROG_PHASENAME === 'B') cncB = p.PROG_FILENAME || '-';
            });
        }
        setSecText('detail-cnc-a', cncA);
        setSecText('detail-cnc-b', cncB);

        // Comment
        const compCommentEl = secEl.querySelector('#comp-detail-comment') || document.getElementById('comp-detail-comment');
        if (compCommentEl) compCommentEl.innerText = data.COMMENT || '—';

        // Thumbnail
        if (thumbImg) thumbImg.src = `${imgFolder}Labels/${data.FILENAME}_Label.jpg`;
    };

    // 4. Master Table Initialization
    const updateMasterCount = () => {
        const d = document.getElementById('item-count-display');
        if (d) {
            const c = bigPartsTable ? bigPartsTable.getData("active").length : bigPartAssemblies.length;
            d.innerHTML = t("ui.totalitems", { count: c });
        }
    };

    const getMasterColumns = () => {
        let w = {};
        const el = document.getElementById("bigparts-table");
        if (el && el.dataset.colWidths) { try { w = JSON.parse(el.dataset.colWidths); } catch (e) { } }
        const imgFolder = window.AVL_OFFLINE_MODE ? '_SOURCE/IMG/' : '../IMG/';

        return [
            { title: t("th.bpindex"), field: "BPINDEX", width: w["BPINDEX"] || 80, sorter: "number" },
            {
                title: t("th.desc"),
                field: "DESCRIPTION",
                width: w["DESCRIPTION"] || undefined,
                formatter: (cell) => {
                    const data = cell.getRow().getData();
                    return `<strong>${data.DESCRIPTION || ""}</strong><br/><span style="color:var(--color-text-placeholder); font-size: 0.85em;">${data.FILENAME || ""}</span>`;
                }
            },
            { title: t("th.quantity"), field: "QUANTITY", width: w["QUANTITY"] || 80, hozAlign: "center" },
            {
                title: t("th.thumbnail"),
                field: "FILENAME",
                width: w["THUMBNAIL"] || 160,
                hozAlign: "center",
                headerSort: false,
                formatter: (cell) => {
                    const fn = cell.getValue();
                    if (!fn) return "";
                    return `<img src="${imgFolder}BPASM/${fn}_BPASM.jpg" style="max-height:80px; margin-top:5px; border-radius:4px;" onerror="this.style.display='none'" />`;
                }
            },
            { title: t("th.comment"), field: "COMMENT", width: w["COMMENT"] || undefined, headerSort: false }
        ];
    };

    const bpContainer = document.getElementById("bigparts-table");
    if (bpContainer) {
        if (typeof Tabulator !== 'undefined' && Tabulator.findTable) {
            const existing = Tabulator.findTable("#bigparts-table");
            if (existing && existing.length > 0) existing[0].destroy();
        }

        bigPartsTable = new Tabulator("#bigparts-table", {
            data: bigPartAssemblies,
            layout: "fitColumns",
            rowHeight: 95,
            initialSort: [{ column: "BPINDEX", dir: "asc" }],
            columns: getMasterColumns(),
            rowClick: (e, row) => {
                openDetail(row.getData());
            }
        });

        window.addEventListener("avl:langChanged", () => {
            if (bigPartsTable) bigPartsTable.setColumns(getMasterColumns());
            updateMasterCount();
        });

        bigPartsTable.on("tableBuilt", updateMasterCount);
        bigPartsTable.on("dataLoaded", updateMasterCount);
        bigPartsTable.on("dataFiltered", updateMasterCount);
    }

    // Master Search
    const searchInput = document.getElementById("global-search");
    if (searchInput && bigPartsTable) {
        searchInput.addEventListener("input", function () {
            const val = this.value;
            bigPartsTable.setFilter([
                [
                    { field: "BPINDEX", type: "like", value: val },
                    { field: "DESCRIPTION", type: "like", value: val },
                    { field: "FILENAME", type: "like", value: val },
                    { field: "COMMENT", type: "like", value: val }
                ]
            ]);
        });
    }

    // 5. Open Detail View Function
    const openDetail = (assemblyData) => {
        currentAssemblyData = assemblyData;
        const bpIdx = assemblyData.BPINDEX || "";
        const imgFolder = window.AVL_OFFLINE_MODE ? '_SOURCE/IMG/' : '../IMG/';

        // SmallParts under this BigPart: filter SMALLPART list by BPINDEX
        const childParts = [];
        spList.forEach(sp => {
            if (sp.BPINDEX && String(sp.BPINDEX).trim() === String(bpIdx).trim()) {
                const fullPan = allIntProds.find(p => p.FILENAME === sp.FILENAME) || {};
                childParts.push({
                    ...fullPan,
                    ...sp,
                    PAN_LWEB: sp.PAN_LWEB || fullPan.PAN_LWEB || fullPan.PAN_STL || '-',
                    PAN_WWEB: sp.PAN_WWEB || fullPan.PAN_WWEB || fullPan.PAN_STW || '-',
                    PAN_TWL: sp.PAN_TWL || fullPan.PAN_TWL || fullPan.PAN_STT || '-'
                });
            }
        });
        if (childParts.length === 0 && bpIdx) {
            allIntProds.forEach(pan => {
                if (pan.BPINDEX && String(pan.BPINDEX).trim() === String(bpIdx).trim()) {
                    childParts.push(pan);
                }
            });
        }

        currentDetailDataCount = childParts.length;

        // Detail Title
        const titleEl = secEl.querySelector('#detail-title') || document.getElementById('detail-title');
        if (titleEl) {
            titleEl.innerHTML =
                `<span style="display:inline-flex;align-items:center;gap:8px;">` +
                `<span>${assemblyData.DESCRIPTION || "Big Part Details"}</span> ` +
                `<span style="color:var(--color-text-placeholder);font-size:0.85em;font-weight:400;">(BP Index: ${bpIdx})</span>` +
                `</span>`;
        }

        // Switch Views
        if (masterView) masterView.style.display = "none";
        if (detailView) detailView.style.display = "flex";
        setTimeout(() => {
            if (summaryTable && typeof summaryTable.redraw === 'function') summaryTable.redraw(true);
            if (smallPartsTable && typeof smallPartsTable.redraw === 'function') smallPartsTable.redraw(true);
        }, 50);

        const setSecText = (id, val) => {
            const el = secEl.querySelector('#' + id) || document.getElementById(id);
            if (el) el.innerText = val !== undefined && val !== null ? val : '-';
        };

        // Sidebar/Thumb Info
        setSecText('bp-detail-bpindex', bpIdx);
        setSecText('bp-detail-desc', assemblyData.DESCRIPTION || '-');
        setSecText('bp-detail-qty', assemblyData.QUANTITY || '1');
        setSecText('bp-detail-file', assemblyData.FILENAME || '-');
        setSecText('bp-detail-comment', assemblyData.COMMENT || '-');
        if (thumbImg) thumbImg.src = `${imgFolder}BPASM/${assemblyData.FILENAME}_BPASM.jpg`;
        
        // Main Label Image for BigPart
        const bpLabelImg = secEl.querySelector('#bp-label-img') || document.getElementById('bp-label-img');
        if (bpLabelImg) {
            bpLabelImg.src = `${imgFolder}Labels/${assemblyData.FILENAME}_Label.jpg`;
        }

        updatePanelDetails(null);

        // TO_BIGPART Summary Row
        const bpMaster = bpList.find(b => (b.BPINDEX && String(b.BPINDEX).trim() === String(bpIdx).trim()) || b.FILENAME === assemblyData.FILENAME) || {};

        const summaryData = [{
            BPINDEX: assemblyData.BPINDEX || bpMaster.BPINDEX || "-",
            DESCRIPTION: assemblyData.DESCRIPTION || bpMaster.DESCRIPTION || "-",
            BP_MATREF: bpMaster.BP_MATREF || assemblyData.PAN_MATREF || "-",
            BP_L: bpMaster.BP_L || assemblyData.PAN_LWEB || assemblyData.PAN_STL || "-",
            BP_W: bpMaster.BP_W || assemblyData.PAN_WWEB || assemblyData.PAN_STW || "-",
            BP_T: bpMaster.BP_T || assemblyData.PAN_TWL || assemblyData.PAN_STT || "-",
            LAM_INFO: (bpMaster.BP_LAMTOP || bpMaster.BP_LAMBOT || assemblyData.PAN_LAMTOP_MATREF || assemblyData.PAN_LAMBOT_MATREF) ?
                `${bpMaster.BP_LAMTOP || assemblyData.PAN_LAMTOP_MATREF || ''} / ${bpMaster.BP_LAMBOT || assemblyData.PAN_LAMBOT_MATREF || ''}` : "-",
            QUANTITY: assemblyData.QUANTITY || bpMaster.QUANTITY || "1"
        }];

        const getSummaryColumns = () => {
            let w = {};
            const el = document.getElementById("bp-summary-table");
            if (el && el.dataset.colWidths) { try { w = JSON.parse(el.dataset.colWidths); } catch (e) { } }
            return [
                { title: t("th.bpindex"), field: "BPINDEX", width: w["BPINDEX"] || 70, hozAlign: "center" },
                { title: t("th.desc"), field: "DESCRIPTION", width: w["DESCRIPTION"] || undefined },
                { title: t("th.matref"), field: "BP_MATREF", width: w["BP_MATREF"] || 130 },
                { title: t("th.length"), field: "BP_L", width: w["BP_L"] || 70, hozAlign: "center", formatter: (c) => window.AVL_UNITS ? window.AVL_UNITS.formatDim(c.getValue()) : c.getValue() },
                { title: t("th.width"), field: "BP_W", width: w["BP_W"] || 70, hozAlign: "center", formatter: (c) => window.AVL_UNITS ? window.AVL_UNITS.formatDim(c.getValue()) : c.getValue() },
                { title: t("th.thickness"), field: "BP_T", width: w["BP_T"] || 65, hozAlign: "center", formatter: (c) => window.AVL_UNITS ? window.AVL_UNITS.formatDim(c.getValue()) : c.getValue() },
                { title: t("ui.lam"), field: "LAM_INFO", width: w["LAM_INFO"] || 130 },
                { title: t("th.quantity"), field: "QUANTITY", width: w["QUANTITY"] || 60, hozAlign: "center" }
            ];
        };

        const sumContainer = secEl.querySelector("#bp-summary-table") || document.getElementById("bp-summary-table");
        if (sumContainer) {
            if (typeof Tabulator !== 'undefined' && Tabulator.findTable) {
                const existingSum = Tabulator.findTable(sumContainer);
                if (existingSum && existingSum.length > 0) existingSum[0].destroy();
            }

            summaryTable = new Tabulator(sumContainer, {
                data: summaryData,
                layout: "fitColumns",
                rowHeight: 36,
                headerSort: false,
                columns: getSummaryColumns()
            });
        }

        const getSmallPartColumns = () => {
            let w = {};
            const el = secEl.querySelector("#detail-smallparts-table") || document.getElementById("detail-smallparts-table");
            if (el && el.dataset.colWidths) { try { w = JSON.parse(el.dataset.colWidths); } catch (e) { } }
            return [
                { title: t("th.spindex"), field: "SPINDEX", width: w["SPINDEX"] || 65, hozAlign: "center", sorter: "number" },
                {
                    title: t("th.desc"),
                    field: "DESCRIPTION",
                    width: w["DESCRIPTION"] || undefined,
                    formatter: (cell) => {
                        const rData = cell.getRow().getData();
                        return `<strong>${rData.DESCRIPTION || "Component"}</strong><br/><span class="component-filename" style="font-size: 0.85em;">${rData.FILENAME || ""}</span>`;
                    }
                },
                { title: t("th.length"), field: "PAN_LWEB", width: w["BP_L"] || 80, hozAlign: "center", formatter: (c) => window.AVL_UNITS ? window.AVL_UNITS.formatDim(c.getValue()) : c.getValue() },
                { title: t("th.width"), field: "PAN_WWEB", width: w["BP_W"] || 80, hozAlign: "center", formatter: (c) => window.AVL_UNITS ? window.AVL_UNITS.formatDim(c.getValue()) : c.getValue() },
                { title: t("th.thickness"), field: "PAN_TWL", width: w["BP_T"] || 70, hozAlign: "center", formatter: (c) => window.AVL_UNITS ? window.AVL_UNITS.formatDim(c.getValue()) : c.getValue() },
                {
                    title: t("th.edges"),
                    field: "PAN_EBCOUNT",
                    width: 50,
                    hozAlign: "center",
                    vertAlign: "middle",
                    headerSort: true,
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
                { title: t("th.cabsnr"), field: "SNR_CAB", width: w["SNR_CAB"] || 100 }
            ];
        };

        const spContainer = secEl.querySelector("#detail-smallparts-table") || document.getElementById("detail-smallparts-table");
        if (spContainer) {
            if (typeof Tabulator !== 'undefined' && Tabulator.findTable) {
                const existingSp = Tabulator.findTable(spContainer);
                if (existingSp && existingSp.length > 0) existingSp[0].destroy();
            }

            smallPartsTable = new Tabulator(spContainer, {
                data: childParts,
                layout: "fitColumns",
                selectableRows: 1,
                columns: getSmallPartColumns()
            });

            smallPartsTable.on("rowSelectionChanged", (data, rows) => {
                if (rows.length > 0) {
                    updatePanelDetails(rows[0].getData());
                } else {
                    updatePanelDetails(null);
                }
            });

            // SmallParts search
            const detailSearchInput = secEl.querySelector("#detail-global-search") || document.getElementById("detail-global-search");
            if (detailSearchInput) {
                detailSearchInput.value = "";
                detailSearchInput.oninput = function () {
                    const val = this.value;
                    smallPartsTable.setFilter([
                        [
                            { field: "SPINDEX", type: "like", value: val },
                            { field: "DESCRIPTION", type: "like", value: val },
                            { field: "FILENAME", type: "like", value: val }
                        ]
                    ]);
                };
            }
        }

        setTimeout(() => {
            if (summaryTable) summaryTable.redraw(true);
            if (smallPartsTable) smallPartsTable.redraw(true);
        }, 100);
    };

    if (bigPartsTable) {
        bigPartsTable.on("rowClick", (e, row) => {
            openDetail(row.getData());
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            if (detailView) detailView.style.display = "none";
            if (masterView) masterView.style.display = "flex";
            if (bigPartsTable) bigPartsTable.redraw(true);
        });
    }
});
