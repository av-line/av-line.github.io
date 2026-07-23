function initSummaryTables() {
    const viewSec = document.getElementById('view-summary') || document;
    const tableEl = viewSec.querySelector('#material-summary-table') || document.getElementById('material-summary-table');
    if (!tableEl) return;
    if (tableEl.classList.contains('tabulator') && tableEl.children.length > 0) return;

    let materialTable, edgebandTable, laminateTable;
    window.summaryTables = [];

    function getMaterialColumns() {
        let w = {};
        const el = document.getElementById("material-summary-table");
        if (el && el.dataset.colWidths) { try { w = JSON.parse(el.dataset.colWidths); } catch(e) {} }
        
        return [
            { title: window.AVL_LANG.t("th.matref"), field: "PAN_MATREF", width: w["PAN_MATREF"] || undefined },
            { title: window.AVL_LANG.t("th.matdesc"), field: "PAN_MATDESC", width: w["PAN_MATDESC"] || undefined },
            { title: window.AVL_LANG.t("th.thickness"), field: "PAN_MAT_T", width: w["PAN_MAT_T"] || undefined },
            { 
               title: window.AVL_LANG.t("th.summary"), 
               field: "SUMMARY", 
               formatter: function(cell) { 
                   const u = cell.getData().UNIT;
                   const v = cell.getValue();
                   if (window.AVL_UNITS) return '<b>' + window.AVL_UNITS.formatSummary(v, u) + '</b>';
                   const valFormat = (u === "pc") ? Math.round(v) : v.toFixed(3);
                   return "<b>" + valFormat + " " + u + "</b>"; 
               },
               width: w["SUMMARY"] || undefined
            }
        ];
    }

    function getEdgebandColumns() {
        let w = {};
        const el = document.getElementById("edgeband-summary-table");
        if (el && el.dataset.colWidths) { try { w = JSON.parse(el.dataset.colWidths); } catch(e) {} }
        
        return [
            { title: window.AVL_LANG.t("th.ebref"), field: "EB REF", width: w["EB REF"] || undefined },
            { title: window.AVL_LANG.t("th.ebdesc"), field: "EB Description", width: w["EB Description"] || undefined },
            { title: window.AVL_LANG.t("th.ebthickness"), field: "EB Thickness", width: w["EB Thickness"] || undefined },
            { 
               title: window.AVL_LANG.t("th.summary"), 
               field: "SUMMARY", 
               formatter: function(cell) {
                   const v = parseFloat(cell.getValue()) || 0;
                   if (window.AVL_UNITS) return '<b>' + window.AVL_UNITS.formatLengthFromLM(v) + '</b>';
                   return "<b>" + v.toFixed(3) + " lm</b>";
               },
               width: w["SUMMARY"] || undefined
            }
        ];
    }

    function getLaminateColumns() {
        let w = {};
        const el = document.getElementById("laminate-summary-table");
        if (el && el.dataset.colWidths) { try { w = JSON.parse(el.dataset.colWidths); } catch(e) {} }
        
        return [
            { title: window.AVL_LANG.t("th.lamref"), field: "LAM REF", width: w["LAM REF"] || undefined },
            { title: window.AVL_LANG.t("th.lamdesc"), field: "LAM Description", width: w["LAM Description"] || undefined },
            { title: window.AVL_LANG.t("th.lamthickness"), field: "LAM Thickness", width: w["LAM Thickness"] || undefined },
            { 
               title: window.AVL_LANG.t("th.summary"), 
               field: "SUMMARY", 
               formatter: function(cell) { 
                   const u = cell.getData().UNIT;
                   const v = cell.getValue();
                   if (window.AVL_UNITS) return '<b>' + window.AVL_UNITS.formatSummary(v, u) + '</b>';
                   const valFormat = (u === "pc") ? Math.round(v) : v.toFixed(3);
                   return "<b>" + valFormat + " " + u + "</b>"; 
               },
               width: w["SUMMARY"] || undefined
            }
        ];
    }

    function renderSummaries() {
        const useFactor = document.getElementById("use-factor-cb") ? document.getElementById("use-factor-cb").checked : false;

        const materialSummaryMap = {};
        const edgebandSummaryMap = {};
        const laminateSummaryMap = {};

        const getArray = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'object') return [v];
        return [];
    };
        if (typeof reportData !== 'undefined' && reportData && reportData.Project && reportData.Project.INTERNALPRODUCTION) {
            const smallPartSet = new Set();
            getArray(reportData.Project.SMALLPART).forEach(sp => {
                if (sp.FILENAME) {
                    const fn = sp.FILENAME.trim().toUpperCase();
                    smallPartSet.add(fn);
                    console.log("[DEBUG] Found SMALLPART filename:", fn, sp.DESCRIPTION);
                }
            });
            console.log("[DEBUG] Total smallPartSet size:", smallPartSet.size);

            const bigPartFilenames = new Set();
            getArray(reportData.Project.BIGPART).forEach(bp => {
                if (bp.FILENAME) {
                    const fn = bp.FILENAME.trim().toUpperCase();
                    bigPartFilenames.add(fn);
                    console.log("[DEBUG] Found BIGPART filename:", fn);
                }
            });
            getArray(reportData.Project.BIGPART_ASSEMBLY).forEach(bpa => {
                if (bpa.FILENAME) {
                    const fn = bpa.FILENAME.trim().toUpperCase();
                    bigPartFilenames.add(fn);
                    console.log("[DEBUG] Found BIGPART_ASSEMBLY filename:", fn);
                }
            });
            console.log("[DEBUG] Total bigPartFilenames size:", bigPartFilenames.size);

            const allParts = [...getArray(reportData.Project.INTERNALPRODUCTION)];

            allParts.forEach(pan => {
                        
                        // --- Handle Material ---
                        const matRef = pan.PAN_MATREF;
                        if (matRef) {
                            const matDesc = pan.PAN_MATDESC || "";
                            const matStt = pan.PAN_MAT_T || "";
                            const lweb = parseFloat(pan.PAN_LWEB) || 0;
                            const wweb = parseFloat(pan.PAN_WWEB) || 0;
                            const stt = parseFloat(pan.PAN_MAT_T) || 0;
                            const costType = pan.PAN_MATCOSTTYPE;
                            const costFactor = useFactor ? (parseFloat(pan.PAN_MATCOSTFACTOR) || 1) : 1;
                            
                            let qty = 0;
                            let unit = "";
                            
                            // Type 0 is m³, Type 1 is m², Type 2 is lm, Type 3 is pc. Using type 1 as default
                            if (costType === "0") {
                                qty = (lweb * wweb * stt) / 1000000000;
                                unit = "m³";
                            } else if (costType === "2") {
                                const stl = parseFloat(pan.PAN_STL) || 0;
                                qty = stl / 1000;
                                unit = "lm";
                            } else if (costType === "3") {
                                qty = 1;
                                unit = "pc";
                            } else {
                                qty = (lweb * wweb) / 1000000;
                                unit = "m²";
                            }
                            
                            qty = qty * costFactor * parseFloat(pan.QTY || pan.QUANTITY || 1);
                            
                            if (!materialSummaryMap[matRef]) {
                                materialSummaryMap[matRef] = {
                                    PAN_MATREF: matRef,
                                    PAN_MAT_T: matStt,
                                    PAN_MATDESC: matDesc,
                                    UNIT: unit,
                                    SUMMARY: 0
                                };
                            }
                            materialSummaryMap[matRef].SUMMARY += qty;
                        }
                        
                        // --- Handle Edgeband ---
                        const edges = [
                            { name: pan.PAN_EBL_NAME, desc: pan.PAN_EBL_MATREF, t: pan.PAN_EBL_T, lstock: parseFloat(pan.PAN_EBL_LSTOCK) || 0 },
                            { name: pan.PAN_EBR_NAME, desc: pan.PAN_EBR_MATREF, t: pan.PAN_EBR_T, lstock: parseFloat(pan.PAN_EBR_LSTOCK) || 0 },
                            { name: pan.PAN_EBF_NAME, desc: pan.PAN_EBF_MATREF, t: pan.PAN_EBF_T, lstock: parseFloat(pan.PAN_EBF_LSTOCK) || 0 },
                            { name: pan.PAN_EBB_NAME, desc: pan.PAN_EBB_MATREF, t: pan.PAN_EBB_T, lstock: parseFloat(pan.PAN_EBB_LSTOCK) || 0 }
                        ];
                        
                        edges.forEach(edge => {
                            if (edge.name) {
                                const lm = (edge.lstock / 1000) * parseFloat(pan.QTY || pan.QUANTITY || 1);
                                const desc = edge.desc || "";
                                const t = edge.t || "";
                                const key = `${edge.name}_${desc}_${t}`;
                                
                                if (!edgebandSummaryMap[key]) {
                                    edgebandSummaryMap[key] = {
                                        'EB REF': edge.name,
                                        'EB Description': desc,
                                        'EB Thickness': t,
                                        'SUMMARY': 0
                                    };
                                }
                                edgebandSummaryMap[key].SUMMARY += lm;
                            }
                        });

                        // --- Handle Laminates ---
                        const laminates = [
                            { 
                              ref: pan.PAN_LAMTOP_MATREF, desc: pan.PAN_LAMTOP_DESC || "", t: pan.PAN_LAMTOP_ST_T, 
                              l: parseFloat(pan.PAN_LAMTOP_ST_L) || 0, w: parseFloat(pan.PAN_LAMTOP_ST_W) || 0,
                              type: pan.PAN_LAMTOP_MATCOSTTYPE, factor: useFactor ? (parseFloat(pan.PAN_LAMTOP_MATCOSTFACTOR)||1) : 1
                            },
                            { 
                              ref: pan.PAN_LAMBOT_MATREF, desc: pan.PAN_LAMBOT_DESC || "", t: pan.PAN_LAMBOT_ST_T, 
                              l: parseFloat(pan.PAN_LAMBOT_ST_L) || 0, w: parseFloat(pan.PAN_LAMBOT_ST_W) || 0,
                              type: pan.PAN_LAMBOT_MATCOSTTYPE, factor: useFactor ? (parseFloat(pan.PAN_LAMBOT_MATCOSTFACTOR)||1) : 1
                            }
                        ];
                        
                        laminates.forEach(lam => {
                            if (lam.ref) {
                                let qty = 0;
                                let unit = "";
                                let stt = parseFloat(lam.t) || 0;

                                if (lam.type === "0") {
                                    qty = (lam.l * lam.w * stt) / 1000000000;
                                    unit = "m³";
                                } else if (lam.type === "2") {
                                    qty = lam.l / 1000;
                                    unit = "lm";
                                } else if (lam.type === "3") {
                                    qty = 1;
                                    unit = "pc";
                                } else {
                                    qty = (lam.l * lam.w) / 1000000;
                                    unit = "m²";
                                }
                                
                                qty = qty * lam.factor * parseFloat(pan.QTY || pan.QUANTITY || 1);

                                const t = lam.t || "";
                                const key = lam.ref;
                                
                                if (!laminateSummaryMap[key]) {
                                    console.log('[LAM]', key, '| desc:', lam.desc, '| pan.PAN_LAMTOP_DESC:', pan.PAN_LAMTOP_DESC, '| pan.PAN_LAMBOT_DESC:', pan.PAN_LAMBOT_DESC);
                                    laminateSummaryMap[key] = {
                                        'LAM REF': lam.ref,
                                        'LAM Description': lam.desc,
                                        'LAM Thickness': t,
                                        'UNIT': unit,
                                        'SUMMARY': 0
                                    };
                                } else {
                                    // If current thickness is "0" or "0.00" or empty, and new thickness is not, update it
                                    const currentT = parseFloat(laminateSummaryMap[key]['LAM Thickness']) || 0;
                                    const newT = parseFloat(t) || 0;
                                    if (newT > currentT) {
                                        laminateSummaryMap[key]['LAM Thickness'] = t;
                                    }
                                    // Fill description if first occurrence left it empty
                                    if (!laminateSummaryMap[key]['LAM Description'] && lam.desc) {
                                        laminateSummaryMap[key]['LAM Description'] = lam.desc;
                                    }
                                }
                                laminateSummaryMap[key].SUMMARY += qty;
                            }
                        });
            });
        }

        const materialData = Object.values(materialSummaryMap);
        const edgebandData = Object.values(edgebandSummaryMap);
        const laminateData = Object.values(laminateSummaryMap);

        window.summaryTables = [];

        // Initialize Material Table if data exists
        if (materialData.length > 0) {
            document.getElementById("material-section").style.display = "block";
            if (!materialTable) {
                materialTable = new Tabulator("#material-summary-table", {
                    data: materialData,
                    layout: "fitColumns",
                    responsiveLayout: "collapse",
                    placeholder: window.AVL_LANG.t("section.notfound.mat"),
                    columnDefaults: { headerFilterLiveFilter: false },
                    columns: getMaterialColumns()
                });
            } else {
                materialTable.setData(materialData);
            }
            window.summaryTables.push({ name: window.AVL_LANG.t("section.material"), instance: materialTable });
        } else {
            const el = document.getElementById("material-section");
            if (el) el.style.display = "none";
        }

        // Initialize Edgeband Table if data exists
        if (edgebandData.length > 0) {
            document.getElementById("edgeband-section").style.display = "block";
            if (!edgebandTable) {
                edgebandTable = new Tabulator("#edgeband-summary-table", {
                    data: edgebandData,
                    layout: "fitColumns",
                    responsiveLayout: "collapse",
                    placeholder: window.AVL_LANG.t("section.notfound.eb"),
                    columnDefaults: { headerFilterLiveFilter: false },
                    columns: getEdgebandColumns()
                });
            } else {
                edgebandTable.setData(edgebandData);
            }
            window.summaryTables.push({ name: window.AVL_LANG.t("section.edgeband"), instance: edgebandTable });
        } else {
            const el = document.getElementById("edgeband-section");
            if (el) el.style.display = "none";
        }

        // Initialize Laminate Table if data exists
        if (laminateData.length > 0) {
            document.getElementById("laminate-section").style.display = "block";
            if (!laminateTable) {
                laminateTable = new Tabulator("#laminate-summary-table", {
                    data: laminateData,
                    layout: "fitColumns",
                    responsiveLayout: "collapse",
                    placeholder: window.AVL_LANG.t("section.notfound.lam"),
                    columnDefaults: { headerFilterLiveFilter: false },
                    columns: getLaminateColumns()
                });
            } else {
                laminateTable.setData(laminateData);
            }
            window.summaryTables.push({ name: window.AVL_LANG.t("section.laminate"), instance: laminateTable });
        } else {
            const el = document.getElementById("laminate-section");
            if (el) el.style.display = "none";
        }
    }

    renderSummaries();

    window.addEventListener("avl:langChanged", () => {
        if (materialTable) {
            materialTable.setColumns(getMaterialColumns());
            window.summaryTables.filter(t => t.instance === materialTable).forEach(t => t.name = window.AVL_LANG.t("section.material"));
        }
        if (edgebandTable) {
            edgebandTable.setColumns(getEdgebandColumns());
            window.summaryTables.filter(t => t.instance === edgebandTable).forEach(t => t.name = window.AVL_LANG.t("section.edgeband"));
        }
        if (laminateTable) {
            laminateTable.setColumns(getLaminateColumns());
            window.summaryTables.filter(t => t.instance === laminateTable).forEach(t => t.name = window.AVL_LANG.t("section.laminate"));
        }
    });

    const cb = document.getElementById("use-factor-cb");
    if (cb) {
        cb.addEventListener("change", renderSummaries);
    }

    const exportBtn = document.getElementById("export-all-btn");
    const exportMenu = document.getElementById("export-all-menu");

    if (exportBtn && exportMenu) {
        exportBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            exportMenu.classList.toggle("show");
            exportBtn.classList.toggle("active");
        });

        // Combined CSV logic
        document.getElementById("export-all-csv").addEventListener("click", () => {
            const delim = window.AVL_CSV ? window.AVL_CSV.getDelimiter() : ";";
            let csv = "";
            window.summaryTables.forEach(t => {
                csv += `--- ${window.AVL_LANG.t("section."+t.name.split(" ")[0].toLowerCase()) || t.name} ---\n`;
                const cols = t.instance.getColumnDefinitions();
                const headers = cols.map(c => c.title);
                const fields = cols.map(c => c.field);
                
                csv += headers.map(h => `"${h}"`).join(delim) + "\n";
                
                const data = t.instance.getData();
                data.forEach(row => {
                    const line = fields.map(f => {
                        let val = row[f];
                        if (val == null) val = "";
                        if (f === "SUMMARY" && typeof val === 'number') {
                            // Use unit-aware formatting for CSV export too
                            const u = row.UNIT || '';
                            val = window.AVL_UNITS ? window.AVL_UNITS.formatSummary(val, u) : 
                                  ((u === "pc") ? Math.round(val) : val.toFixed(3) + (u ? ' ' + u : ''));
                        } else if (typeof val === 'number') {
                            val = val.toFixed(3);
                        }
                        return `"${val}"`;
                    }).join(delim);
                    csv += line + "\n";
                });
                csv += "\n";
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "All_Summaries.csv");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            exportMenu.classList.remove("show");
            exportBtn.classList.remove("active");
        });

        // Combined XLSX logic
        document.getElementById("export-all-xlsx").addEventListener("click", () => {
            if (typeof XLSX !== 'undefined') {
                const wb = XLSX.utils.book_new();
                
                window.summaryTables.forEach(t => {
                    const cols = t.instance.getColumnDefinitions();
                    const data = t.instance.getData();
                    
                    const sheetData = data.map(row => {
                        const newRow = {};
                        cols.forEach(c => {
                            let val = row[c.field];
                            if (typeof val === 'number') {
                                val = (row.UNIT === "pc") ? Math.round(val) : parseFloat(val.toFixed(3));
                            }
                            if (c.field === "SUMMARY" && row.UNIT) {
                                newRow[`SUMMARY (${row.UNIT})`] = val;
                            } else {
                                newRow[c.title] = val != null ? val : "";
                            }
                        });
                        return newRow;
                    });
                    
                    const ws = XLSX.utils.json_to_sheet(sheetData);
                    let sheetName = window.AVL_LANG.t("section."+t.name.split(" ")[0].toLowerCase()) || t.name;
                    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Max length 31
                });

                XLSX.writeFile(wb, "All_Summaries.xlsx");
            } else {
                alert("Excel export library not loaded.");
            }
            exportMenu.classList.remove("show");
            exportBtn.classList.remove("active");
        });
    }

    // Close export menus on click outside
    document.addEventListener("click", (e) => {
        if (exportMenu && !exportMenu.contains(e.target) && !exportBtn.contains(e.target)) {
            exportMenu.classList.remove("show");
            exportBtn.classList.remove("active");
        }
    });

    // Populate footer
    if (typeof reportData !== 'undefined' && reportData.Project) {
        if(document.getElementById("foot-cus")) document.getElementById("foot-cus").innerText = reportData.Project.CUS_NAME || "-";
        if(document.getElementById("foot-projnr")) document.getElementById("foot-projnr").innerText = reportData.Project.PRJ_NR || "-";
        if(document.getElementById("foot-eng")) document.getElementById("foot-eng").innerText = reportData.Project.ENGINEER || "-";
        if(document.getElementById("foot-projname")) document.getElementById("foot-projname").innerText = reportData.Project.PRJ_NAME || "-";
        if(document.getElementById("foot-projpos")) document.getElementById("foot-projpos").innerText = reportData.Project.PRJ_POSITION || "-";
        if(document.getElementById("foot-report")) document.getElementById("foot-report").innerText = (reportData.Project.REPORT_TYPE || "") + " | " + (reportData.Project.REPORT_VERSION || "");
    }

    // Re-render summaries when unit format changes (m²→ft², lm→LF etc.)
    window.addEventListener('avl:unitChanged', function() {
        if (typeof renderSummaries === 'function') renderSummaries();
        if (window.summaryTables) {
            window.summaryTables.forEach(t => {
                if (t.instance) {
                    const n = (t.name || '').toLowerCase();
                    if (n.includes('material') && typeof getMaterialColumns === 'function') t.instance.setColumns(getMaterialColumns());
                    else if (n.includes('edgeband') && typeof getEdgebandColumns === 'function') t.instance.setColumns(getEdgebandColumns());
                    else if (n.includes('laminate') && typeof getLaminateColumns === 'function') t.instance.setColumns(getLaminateColumns());
                }
            });
        }
    });
}
document.addEventListener("DOMContentLoaded", initSummaryTables);
window.addEventListener("avl:viewChanged", function(e) {
    if (e.detail && e.detail.view === 'summary') initSummaryTables();
});
