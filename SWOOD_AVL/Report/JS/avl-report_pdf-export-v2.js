// AVL PDF Export v2 — High Fidelity Professional Reporting
/* global reportData, window, document, QRCode, html2canvas */

    const LOGO_COMPACT = "https://av-line.github.io/images/LogoAV.webp";
    const t = (...args) => (window.AVL_LANG && window.AVL_LANG.t) ? window.AVL_LANG.t(...args) : args[0];

    const PDF_COLORS = {
        production: "#0099d9",
        cabinets: "#3B82F6",
        bigparts: "#10B981",
        laminates: "#8B5CF6",
        programs: "#06B6D4",
        fittings: "#EC4899",
        purchase: "#84CC16"
    };

    const getProjectCounts = () => {
        if (typeof reportData === 'undefined' || !reportData.Project) return {};
        const proj = reportData.Project;
        const getArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);
        
        const cabinets = getArray(proj.CABINET);
        const cabFilenames = new Set(cabinets.map(c => c.FILENAME).filter(Boolean));
        const internalParts = getArray(proj.INTERNALPRODUCTION);
        
        let panels = 0, laminates = 0, programs = 0;
        internalParts.forEach(p => {
            if (p.FILENAME && cabFilenames.has(p.FILENAME)) return;
            const q = parseInt(p.QTY || p.QUANTITY || 1, 10) || 0;
            panels += q;
            if (p.PAN_LAMTOP_MATREF || p.PAN_LAMBOT_MATREF) laminates += q;
            getArray(p.PROGRAMS).forEach(pr => { 
                if (pr && pr.PROG_FILENAME && String(pr.PROG_FILENAME).trim() !== "") programs++; 
            });
        });

        return {
            cabinets: cabinets.length,
            bigparts: getArray(proj.BIGPART).length,
            panels: panels,
            laminates: laminates,
            programs: programs,
            fittings: getArray(proj.FITTING).length + getArray(proj.FITTING_EFICAD).length + getArray(proj.FITTING_LV).length,
            purchase: getArray(proj.EXTERNALPRODUCTION).length
        };
    };

    function showSelectionModal() {
        if (typeof reportData === 'undefined' || !reportData.Project) {
            alert("No project data found.");
            return;
        }
        const t = (...args) => (window.AVL_LANG && window.AVL_LANG.t) ? window.AVL_LANG.t(...args) : args[0];
        const counts = getProjectCounts();

        let modal = document.getElementById('pdf-selection-modal');
        if (modal) { modal.style.display = 'flex'; return; }
        
        modal = document.createElement('div');
        modal.id = 'pdf-selection-modal';
        modal.innerHTML = `
            <div class="pdf-modal-content">
                <div class="pdf-modal-header">
                    <h3 data-i18n="pdf.export.title">${t("pdf.export.title")}</h3>
                    <span class="material-symbols-rounded" style="cursor:pointer; color:#94a3b8;" onclick="document.getElementById('pdf-selection-modal').style.display='none'">close</span>
                </div>
                <div class="pdf-modal-body">
                    <!-- Overview option removed (printed by default) -->
                    <label class="pdf-option" style="${counts.panels <= 0 ? 'display:none' : ''}"><input type="checkbox" id="opt-panels" checked> <span data-i18n="menu.panels">${t("menu.panels")}</span></label>
                    <label class="pdf-option" style="display:none"><input type="checkbox" id="opt-cabs-index"> <span data-i18n="menu.cabinets">${t("menu.cabinets")}</span> <span data-i18n="pdf.index.suffix">${t("pdf.index.suffix")}</span></label>
                    <label class="pdf-option" style="${counts.cabinets <= 0 ? 'display:none' : ''}"><input type="checkbox" id="opt-cabs-details" checked> <span data-i18n="menu.cabinets">${t("menu.cabinets")}</span> <span data-i18n="pdf.details.suffix">${t("pdf.details.suffix")}</span></label>
                    <label class="pdf-option" style="${counts.bigparts <= 0 ? 'display:none' : ''}"><input type="checkbox" id="opt-bigparts" checked> <span data-i18n="page.title.bigparts">${t("page.title.bigparts")}</span></label>
                    <label class="pdf-option" style="${counts.laminates <= 0 ? 'display:none' : ''}"><input type="checkbox" id="opt-laminates" checked> <span data-i18n="menu.laminates">${t("menu.laminates")}</span></label>
                    <label class="pdf-option" style="${counts.programs <= 0 ? 'display:none' : ''}"><input type="checkbox" id="opt-programs" checked> <span data-i18n="menu.cncprograms">${t("menu.cncprograms")}</span></label>
                    <label class="pdf-option" style="${counts.fittings <= 0 ? 'display:none' : ''}"><input type="checkbox" id="opt-fittings" checked> <span data-i18n="menu.fittings">${t("menu.fittings")}</span></label>
                    <label class="pdf-option" style="${counts.purchase <= 0 ? 'display:none' : ''}"><input type="checkbox" id="opt-purchase" checked> <span data-i18n="menu.purchase">${t("menu.purchase")}</span></label>
                    <label class="pdf-option"><input type="checkbox" id="opt-summary" checked> <span data-i18n="menu.summary">${t("menu.summary")}</span></label>
                    <label class="pdf-option" style="border-top:1px solid #e2e8f0;margin-top:6px;padding-top:6px;"><input type="checkbox" id="opt-toc" checked> <span>${t("pdf.toc.title") || "Table of Contents"}</span></label>
                </div>
                <div class="pdf-modal-footer">
                    <button class="pdf-modal-btn pdf-btn-cancel" onclick="document.getElementById('pdf-selection-modal').style.display='none'" data-i18n="pdf.export.cancel">${t("pdf.export.cancel")}</button>
                    <button class="pdf-modal-btn pdf-btn-generate" id="pdf-start-btn" data-i18n="pdf.export.generate">${t("pdf.export.generate")}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';

        document.getElementById('pdf-start-btn').addEventListener('click', async () => {
            const config = {
                overview: true,
                panels: document.getElementById('opt-panels')?.checked || false,
                cabsIndex: document.getElementById('opt-cabs-index')?.checked || false,
                cabsDetails: document.getElementById('opt-cabs-details')?.checked || false,
                bigparts: document.getElementById('opt-bigparts')?.checked || false,
                laminates: document.getElementById('opt-laminates')?.checked || false,
                programs: document.getElementById('opt-programs')?.checked || false,
                fittings: document.getElementById('opt-fittings')?.checked || false,
                purchase: document.getElementById('opt-purchase')?.checked || false,
                summary: document.getElementById('opt-summary')?.checked || false,
                toc: document.getElementById('opt-toc')?.checked !== false
            };
            modal.style.display = 'none';
            const overlay = document.getElementById('print-overlay');
            if (overlay) overlay.style.display = 'flex';
            await new Promise(r => setTimeout(r, 60));
            generateReport(config);
        });
    }
    window.showSelectionModal = showSelectionModal;

    async function generateReport(config = {}) {
        if (typeof reportData === 'undefined' || !reportData.Project) return;

        const overlay = document.getElementById('print-overlay');
        const overlayMsg = document.getElementById('print-overlay-msg');
        if (overlay) overlay.style.display = 'flex';
        await new Promise(r => setTimeout(r, 60));

        const t = (...args) => (window.AVL_LANG && window.AVL_LANG.t) ? window.AVL_LANG.t(...args) : args[0];



        let container = null;
        try {
            const proj = reportData.Project;
            const getArray = (v) => Array.isArray(v) ? v : (v ? [v] : []);
            
            container = document.createElement('div');
            container.id = 'pdf-render-container';
            Object.assign(container.style, { position: 'fixed', top: '0', left: '0', width: '800px', zIndex: '9999', background: '#fff', opacity: '0.999' });
            
            const style = document.createElement('style');
            style.innerHTML = `
                #pdf-render-container .pdf-table td.text-main,
                #pdf-render-container .pdf-table td.text-sub { display: table-cell !important; }
                #pdf-render-container .pdf-table td.edge-cell {
                    overflow: visible !important;
                    text-align: center !important;
                    padding: 0 !important;
                    position: relative !important;
                    vertical-align: middle !important;
                }
                #pdf-render-container .pdf-table td.edge-cell .edge-svg-container {
                    width: 28px !important;
                    height: 28px !important;
                    display: inline-block !important;
                    vertical-align: middle !important;
                    margin: 0 auto !important;
                    position: relative !important;
                    overflow: visible !important;
                }
                #pdf-render-container .pdf-table td.edge-cell .edge-svg-container svg {
                    width: 100% !important;
                    height: 100% !important;
                    display: block !important;
                }
            `;
            container.appendChild(style);
            document.body.appendChild(container);

            overlayMsg.innerText = t("pdf.loading");
            const cabs = sortArrayBySNR(getArray(proj.CABINET), "SNR_CAB");
            const cabFilenames = new Set(cabs.map(c => c.FILENAME).filter(Boolean));
            const cabImageMap = {};
            
            await Promise.all(cabs.map(async (cab) => {
                if (cab.FILENAME) cabImageMap[cab.FILENAME] = await loadImageToBase64("../IMG/Cabs/" + cab.FILENAME + "_CAB.jpg");
            }));
            const projectImgBase64 = await loadImageToBase64("../IMG/Project/" + (proj.FILENAME || proj.PRJ_NAME || '') + "_Project.jpg");

            const tocEntries = [];
            let currentPageNum = 1;
            let overviewPage = null;
            const counts = getProjectCounts();
            
            // --- 1. OVERVIEW PAGE ---
            if (config.overview) {
                overviewPage = createPage('overview', false);
                overviewPage.innerHTML += `
                    <h1 class="pdf-title">${proj.PRJ_NAME || t("pdf.project_report")}</h1>
                    <p class="pdf-subtitle">${proj.FILENAME || ''}</p>
                    <div class="pdf-metadata-grid">
                        ${createMetaItem(t("dash.prjnr"), proj.PRJ_NR)}
                        ${createMetaItem(t("dash.position"), proj.PRJ_POSITION)}
                        ${createMetaItem(t("dash.leader"), proj.PRJ_LEADER)}
                        ${createMetaItem(t("dash.engineer"), proj.ENGINEER)}
                        ${createMetaItem(t("dash.version"), proj.REPORT_VERSION)}
                    </div>
                    <div class="pdf-metadata-item" style="margin-top: 5px; width: 100%;">
                        <div class="pdf-meta-label">${t("dash.comment")}</div>
                        <div class="pdf-meta-value" style="font-style: italic; font-weight: normal;">${proj.COMMENT_PRJ || '-'}</div>
                    </div>
                    <div class="pdf-section-title" style="margin-top: 25px;">${t("dash.breakdown") || "Component Breakdown"}</div>
                    <div style="background: #fff; border: 0.5px solid #e2e8f0; padding: 25px; margin-top: 5px; display: flex; align-items: center; gap: 40px;">
                        <div style="flex: 0 0 150px;">
                            <svg viewBox="0 0 100 100" style="width: 150px; height: 150px;">
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" stroke-width="12"></circle>
                                <g id="pdf-donut-segments"></g>
                            </svg>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                            ${renderLegendItem(t("menu.panels"), counts.panels, PDF_COLORS.production)}
                            ${renderLegendItem(t("menu.cabinets"), counts.cabinets, PDF_COLORS.cabinets)}
                            ${renderLegendItem(t("page.title.bigparts"), counts.bigparts, PDF_COLORS.bigparts)}
                            ${renderLegendItem(t("menu.laminates"), counts.laminates, PDF_COLORS.laminates)}
                            ${renderLegendItem(t("menu.cncprograms"), counts.programs, PDF_COLORS.programs)}
                            ${renderLegendItem(t("menu.fittings"), counts.fittings, PDF_COLORS.fittings)}
                            ${renderLegendItem(t("menu.purchase"), counts.purchase, PDF_COLORS.purchase)}
                        </div>
                    </div>
                    ${projectImgBase64 ? `<div style="margin-top:20px;text-align:center;"><img src="${projectImgBase64}" style="max-width:100%;max-height:280px;object-fit:contain;border:0.5px solid #e2e8f0;"/></div>` : ''}
                `;
                container.appendChild(overviewPage);
                const segs = overviewPage.querySelector("#pdf-donut-segments");
                if (segs) {
                    const data = [{v:counts.panels,c:PDF_COLORS.production},{v:counts.cabinets,c:PDF_COLORS.cabinets},{v:counts.bigparts,c:PDF_COLORS.bigparts},{v:counts.laminates,c:PDF_COLORS.laminates},{v:counts.programs,c:PDF_COLORS.programs},{v:counts.fittings,c:PDF_COLORS.fittings},{v:counts.purchase,c:PDF_COLORS.purchase}].filter(d=>d.v>0);
                    const total = data.reduce((s,d)=>s+d.v,0); let offset = 0; const radius = 40, circ = 2*Math.PI*radius;
                    data.forEach(d => {
                        const len = (d.v/total)*circ, off = (offset/total)*circ;
                        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                        c.setAttribute("cx","50"); c.setAttribute("cy","50"); c.setAttribute("r",radius); c.setAttribute("fill","transparent"); c.setAttribute("stroke",d.c); c.setAttribute("stroke-width","12"); c.setAttribute("stroke-dasharray",`${len} ${circ-len}`); c.setAttribute("stroke-dashoffset",-off);
                        segs.appendChild(c); offset += d.v;
                    });
                }
                tocEntries.push({ title: t("menu.overview"), page: currentPageNum, id: 'overview' });
                currentPageNum++;
            }

            // --- 1b. TOC PAGE (separate, optional) ---
            let tocPage = null;
            if (config.overview && config.toc) {
                tocPage = createPage('toc-page', false);
                tocPage.innerHTML += `<div class="pdf-section-title" style="font-size:14px;margin-bottom:16px;">${t("pdf.toc.title") || "Table of Contents"}</div><div class="pdf-toc-list" id="pdf-toc-list-page"></div>`;
                container.appendChild(tocPage);
                currentPageNum++;
            }

            // --- 2. PANELS (Fertigungsteile) ---
            if (config.panels && counts.panels > 0) {
                const parts = getArray(proj.INTERNALPRODUCTION).filter(p => !cabFilenames.has(p.FILENAME));
                if (parts.length > 0) {
                    // Enrich and sort parts exactly like panels.html
                    const cabBySNR = {};
                    cabs.forEach((cab, cabIdx) => {
                        if (cab.SNR_CAB) cabBySNR[cab.SNR_CAB] = { cabIdx, cab };
                    });

                    parts.forEach(part => {
                        const snr = part.SNR_CAB || '';
                        const cabInfo = snr ? cabBySNR[snr] : null;
                        if (!cabInfo) part.SNR_CAB = "NoCAB";
                    });

                    parts.sort((a, b) => {
                        const snrA = a.SNR_CAB || "";
                        const snrB = b.SNR_CAB || "";
                        
                        const isNoCabA = (snrA === "NoCAB" || snrA === "No CAB" || snrA === "");
                        const isNoCabB = (snrB === "NoCAB" || snrB === "No CAB" || snrB === "");
                        
                        if (isNoCabA && !isNoCabB) return 1;
                        if (!isNoCabA && isNoCabB) return -1;
                        
                        const cmpSNR = String(snrA).localeCompare(String(snrB), undefined, { numeric: true });
                        if (cmpSNR !== 0) return cmpSNR;

                        const listA = a.SNR_CABList || "";
                        const listB = b.SNR_CABList || "";
                        return String(listA).localeCompare(String(listB), undefined, { numeric: true });
                    });

                    tocEntries.push({ title: t("menu.panels"), page: currentPageNum });
                    const chunks = chunkArray(parts, 12); // Fit perfectly on landscape
                    chunks.forEach((chunk, idx) => {
                        const p = createPage(`panels-${idx}`, true);
                        p.innerHTML += `<div class="pdf-section-title">${t("menu.panels")} ${chunks.length > 1 ? `(${idx+1}/${chunks.length})` : ''}</div><table class="pdf-table panels-detailed"><thead><tr><th style="width:50px">${t("th.cabinets")}</th><th style="width:50px" class="col-center">${t("th.cablistsnr")}</th><th style="width:140px">${t("th.desc")}</th><th style="width:100px">${t("th.matref")}</th><th style="width:40px" class="col-center">${t("th.l_short")}</th><th style="width:40px" class="col-center">${t("th.w_short")}</th><th style="width:40px" class="col-center">${t("th.t_short")}</th><th style="width:55px" class="col-center">${t("th.edges")}</th><th style="width:70px">${t("th.edgeinfo")}</th><th style="width:70px">${t("th.laminfo")}</th><th style="width:30px" class="col-center">${t("th.cnc")}</th><th style="width:90px">${t("th.comment")}</th></tr></thead><tbody>${chunk.map(p => buildFlatPanelRow(p, cabs)).join('')}</tbody></table>`;
                        container.appendChild(p); currentPageNum++;
                    });
                }
            }

            // --- 3. CABINETS (Baugruppen) ---
            if ((config.cabsIndex || config.cabsDetails) && counts.cabinets > 0) {
                if (config.cabsIndex) {
                    tocEntries.push({ title: t("menu.cabinets") + t("pdf.index.suffix"), page: currentPageNum });
                    const chunks = chunkArray(cabs, 8);
                    chunks.forEach((chunk, idx) => {
                        const p = createPage(`cabs-index-${idx}`);
                        p.innerHTML += `<div class="pdf-section-title">${t("menu.cabinets")} ${chunks.length > 1 ? `(${idx+1}/${chunks.length})` : ''}</div><div class="pdf-cab-grid">${chunk.map(cab => `<div class="pdf-cab-card"><div class="pdf-cab-card-img"><img src="${cabImageMap[cab.FILENAME] || '../IMG/Labels/no-image.jpg'}"/></div><div class="pdf-cab-card-title">${cab.SNR_CAB} - ${cab.DESCRIPTION_CAB}</div></div>`).join('')}</div>`;
                        container.appendChild(p); currentPageNum++;
                    });
                }
                if (config.cabsDetails) {
                    const usedInt = new Set(); cabs.forEach(c => getArray(c.INTERNALPRODUCTION_PER_CAB).forEach(r => usedInt.add(r.FILENAME)));
                    const noCabInt = getArray(proj.INTERNALPRODUCTION).filter(p => !usedInt.has(p.FILENAME) && !cabFilenames.has(p.FILENAME)).map(p => ({FILENAME: p.FILENAME, QUANTITY: p.QTY || "1"}));
                    const detailedCabs = [...cabs];
                    if (noCabInt.length > 0) detailedCabs.push({ _isNoCab: true, SNR_CAB: "No CAB", DESCRIPTION_CAB: t("type.nocab"), INTERNALPRODUCTION_PER_CAB: noCabInt, QTY: "1" });
                    tocEntries.push({ title: t("menu.cabinets") + t("pdf.details.suffix"), page: currentPageNum });
                    for (const cab of detailedCabs) {
                        tocEntries.push({ title: `${cab.SNR_CAB} - ${cab.DESCRIPTION_CAB}`, page: currentPageNum, isSub: true });
                        const cabParts = getArray(cab.INTERNALPRODUCTION_PER_CAB).map(ref => ({ ref, p: getArray(proj.INTERNALPRODUCTION).find(x => x.FILENAME === ref.FILENAME) || {} }));
                        cabParts.sort((a,b) => String(a.p.SNR_CABList||"99").localeCompare(String(b.p.SNR_CABList||"99"), undefined, {numeric:true}));
                        let pageIdx = 0, currentHeight = 0, MAX_H = 980, currentPage = null;
                        const getPage = (needed) => {
                            if (!currentPage || (currentHeight + needed > MAX_H)) {
                                currentPage = createPage(`cab-${cab.SNR_CAB}-${pageIdx}`);
                                const cabColor = cab._isNoCab ? '#9ca3af' : getCabColor(detailedCabs.indexOf(cab));
                                if (pageIdx === 0) {
                                    currentPage.innerHTML += `<div class="pdf-cab-detail-header">${cab.FILENAME ? `<div class='pdf-cab-large-img'><img src='${cabImageMap[cab.FILENAME]}'/></div>` : ''}<div class="pdf-cab-info"><h2 style="margin:0;display:flex;align-items:center;font-size:16px;"><span class="cab-dot" style="background:${cabColor};"></span>${cab.SNR_CAB} - ${cab.DESCRIPTION_CAB}</h2><div class="pdf-metadata-grid" style="grid-template-columns:1fr 1fr;">${createMetaItem(t("th.quantity"), cab.QTY)}${cab.FILENAME ? createMetaItem(t("th.panelid"), cab.FILENAME) : ''}</div></div></div>`;
                                    currentHeight = 110;
                                } else {
                                    currentPage.innerHTML += `<div class="pdf-cab-detail-header" style="border:none;margin-bottom:10px;"><h2 style="margin:0;font-size:12px;color:#64748b;"><span class="cab-dot" style="background:${cabColor};"></span>${cab.SNR_CAB} - ${cab.DESCRIPTION_CAB} ${t("pdf.cont.suffix")}</h2></div>`;
                                    currentHeight = 35;
                                }
                                container.appendChild(currentPage); pageIdx++; currentPageNum++;
                            }
                            return currentPage;
                        };
                        let cabPartsLeft = [...cabParts];
                        let partIdx = 1;
                        const totalCabParts = cabParts.length;
                        // Portrait page usable height: 1120 - 50pad - 47hdr - 40ftr = ~983px
                        // First page: 983 - 110(cab header) - 28(section title) - 26(th) = ~819px / 34px per row = ~24 rows
                        // Continuation pages: 983 - 35(cont header) - 28 - 26 = ~894px / 34px = ~26 rows
                        // Use conservative values to account for cell-wrap rows growing taller
                        const ROWS_FIRST = 16;
                        const ROWS_CONT  = 20;
                        let isFirstChunk = true;
                        while (cabPartsLeft.length > 0) {
                            const maxRows = isFirstChunk ? ROWS_FIRST : ROWS_CONT;
                            const chunk = cabPartsLeft.splice(0, maxRows);
                            isFirstChunk = false;
                            // Force a new page whenever we run out of rows budget:
                            // On the first chunk we already have currentPage (the cab header page).
                            // On subsequent chunks we need a new page.
                            if (!currentPage || partIdx > 1) {
                                currentHeight = MAX_H + 1; // triggers getPage to create new page
                            }
                            const pg = getPage(60 + chunk.length * 34);
                            const label = (partIdx > 1 || cabPartsLeft.length > 0)
                                ? `${t("menu.panels")} (${partIdx}-${partIdx+chunk.length-1} / ${totalCabParts})`
                                : t("menu.panels");
                            pg.innerHTML += `<div class="pdf-section-title">${label}</div><table class="pdf-table"><thead><tr><th style="width:50px" class="col-center">${t("th.cablistsnr")}</th><th style="width:160px">${t("th.desc")}</th><th style="width:40px" class="col-center">${t("th.qty")}</th><th style="width:100px">${t("th.matref")}</th><th style="width:40px" class="col-center">${t("th.l_short")}</th><th style="width:40px" class="col-center">${t("th.w_short")}</th><th style="width:40px" class="col-center">${t("th.t_short")}</th><th style="width:55px" class="col-center">${t("th.edges")}</th></tr></thead><tbody>${chunk.map(item => buildCabPartRow(item.ref, item.p)).join('')}</tbody></table>`;
                            currentHeight += 60 + chunk.length * 34;
                            partIdx += chunk.length;
                        }
                    }
                }
            }

            // --- 4. BIG PARTS (Großteile) ---
            if (config.bigparts && counts.bigparts > 0) {
                const bpas = getArray(proj.BIGPART_ASSEMBLY).length > 0 ? getArray(proj.BIGPART_ASSEMBLY) : getArray(proj.BIGPART);
                tocEntries.push({ title: t("page.title.bigparts"), page: currentPageNum });
                const chunks = chunkArray(bpas, 14);
                chunks.forEach((chunk, idx) => {
                    const p = createPage(`bigparts-${idx}`);
                    p.innerHTML += `<div class="pdf-section-title">${t("page.title.bigparts")} ${chunks.length > 1 ? `(${idx+1}/${chunks.length})` : ''}</div><table class="pdf-table"><thead><tr><th style="width:50px" class="col-center">${t("th.bpindex")}</th><th>${t("th.desc")}</th><th style="width:50px" class="col-center">${t("th.quantity")}</th><th style="width:100px">${t("th.panelid")}</th><th>${t("th.comment")}</th></tr></thead><tbody>${chunk.map(bp => `<tr><td class="col-center text-main bold">${bp.BPINDEX || '-'}</td><td class="cell-wrap"><span class="text-main bold">${bp.DESCRIPTION || '-'}</span><br><span class="text-sub">${bp.FILENAME || ''}</span></td><td class="col-center text-main">${bp.QUANTITY || '1'}</td><td class="text-sub">${bp.FILENAME || '-'}</td><td class="text-sub">${bp.COMMENT || '-'}</td></tr>`).join('')}</tbody></table>`;
                    container.appendChild(p); currentPageNum++;
                });

                // Detail pages for each Big Part assembly
                const detailedBigParts = getArray(proj.BIGPART_ASSEMBLY).length > 0 ? getArray(proj.BIGPART_ASSEMBLY) : getArray(proj.BIGPART);
                for (const bp of detailedBigParts) {
                    tocEntries.push({ title: `${bp.BPINDEX} - ${bp.DESCRIPTION || 'Big Part'}`, page: currentPageNum, isSub: true });
                    const bpData = getArray(proj.BIGPART).find(x => x.BPINDEX == bp.BPINDEX) || { BP_L: "", BP_W: "", BP_T: "", BP_MATREF: "", BP_LAMTOP: "", BP_LAMBOT: "" };
                    
                    // Get related small parts
                    const relatedSmallParts = getArray(proj.SMALLPART)
                        .filter(sp => sp.BPINDEX == bp.BPINDEX)
                        .map(sp => {
                            const enriched = getArray(proj.INTERNALPRODUCTION).find(x => x.FILENAME === sp.FILENAME) || {};
                            return Object.assign({}, enriched, sp, {
                                L: enriched.PAN_LWEB || "",
                                W: enriched.PAN_WWEB || "",
                                T: enriched.PAN_TWL || ""
                            });
                        });
                    relatedSmallParts.sort((a, b) => (parseInt(a.SPINDEX) || 0) - (parseInt(b.SPINDEX) || 0));

                    let pageIdx = 0, currentHeight = 0, MAX_H = 980, currentPage = null;
                    const getBPPage = (needed) => {
                        if (!currentPage || (currentHeight + needed > MAX_H)) {
                            currentPage = createPage(`bp-detail-${bp.BPINDEX}-${pageIdx}`);
                            if (pageIdx === 0) {
                                currentPage.innerHTML += `<div class="pdf-cab-detail-header"><div class="pdf-cab-info"><h2 style="margin:0;display:flex;align-items:center;font-size:16px;">${bp.BPINDEX} - ${bp.DESCRIPTION || 'Big Part'}</h2><div class="pdf-metadata-grid" style="grid-template-columns:1fr 1fr;">${createMetaItem(t("th.quantity"), bp.QUANTITY || '1')}${bp.FILENAME ? createMetaItem(t("th.panelid"), bp.FILENAME) : ''}</div></div></div>`;
                                currentHeight = 90;
                            } else {
                                currentPage.innerHTML += `<div class="pdf-cab-detail-header" style="border:none;margin-bottom:10px;"><h2 style="margin:0;font-size:12px;color:#64748b;">${bp.BPINDEX} - ${bp.DESCRIPTION || 'Big Part'} ${t("pdf.cont.suffix") || "(Cont.)"}</h2></div>`;
                                currentHeight = 35;
                            }
                            container.appendChild(currentPage); pageIdx++; currentPageNum++;
                        }
                        return currentPage;
                    };

                    // First: Render the Big Part Summary info block
                    const firstPage = getBPPage(140);
                    firstPage.innerHTML += `<div class="pdf-section-title">${t("th.bp_info") || "Big Part Info"}</div><table class="pdf-table"><thead><tr><th style="width:60px" class="col-center">${t("th.bpindex")}</th><th>${t("th.desc")}</th><th style="width:60px" class="col-center">${t("th.quantity")}</th><th>${t("th.matref")}</th><th style="width:60px" class="col-center">${t("th.length")}</th><th style="width:60px" class="col-center">${t("th.width")}</th><th style="width:60px" class="col-center">${t("th.thickness")}</th><th>${t("th.belaginfo") || "Laminate Info"}</th></tr></thead><tbody><tr><td class="col-center text-main bold">${bp.BPINDEX || '-'}</td><td class="cell-wrap"><span class="text-main bold">${bp.DESCRIPTION || '-'}</span><br><span class="text-sub">${bp.FILENAME || ''}</span></td><td class="col-center text-main">${bp.QUANTITY || '1'}</td><td class="text-main">${bpData.BP_MATREF || '-'}</td><td class="col-center text-main">${parseFloat(bpData.BP_L||0).toFixed(2)}</td><td class="col-center text-main">${parseFloat(bpData.BP_W||0).toFixed(2)}</td><td class="col-center text-main">${parseFloat(bpData.BP_T||0).toFixed(2)}</td><td class="text-sub">${t("ui.lam.o")}: ${bpData.BP_LAMTOP || '-'}<br>${t("ui.lam.u")}: ${bpData.BP_LAMBOT || '-'}</td></tr></tbody></table>`;
                    currentHeight += 140;

                    // Second: Render its related Small Parts Components table
                    if (relatedSmallParts.length > 0) {
                        let spPartsLeft = [...relatedSmallParts];
                        let partIdx = 1;
                        const totalSpParts = relatedSmallParts.length;

                        while(spPartsLeft.length > 0) {
                            let available = 1040 - currentHeight - 65;
                            if (available < 120) {
                                getBPPage(1050); // force new page
                                available = 1040 - currentHeight - 65;
                            }
                            let maxRows = Math.floor(available / 34);
                            if (maxRows < 1) maxRows = 1;
                            let chunk = spPartsLeft.splice(0, maxRows);
                            const p = getBPPage(65 + (chunk.length * 34));
                            const label = totalSpParts > chunk.length ? `${t("ui.compinfo") || "Component Parts"} (${partIdx}-${partIdx+chunk.length-1} / ${totalSpParts})` : (t("ui.compinfo") || "Component Parts");
                            p.innerHTML += `<div class="pdf-section-title" style="margin-top:10px;">${label}</div><table class="pdf-table"><thead><tr><th style="width:40px" class="col-center">${t("th.spindex")}</th><th>${t("th.desc")}</th><th style="width:60px" class="col-center">${t("th.length")}</th><th style="width:60px" class="col-center">${t("th.width")}</th><th style="width:60px" class="col-center">${t("th.thickness")}</th><th style="width:55px" class="col-center">${t("th.edges")}</th><th style="width:90px">${t("th.cabsnr")}</th><th style="width:90px">${t("th.cablist")}</th></tr></thead><tbody>${chunk.map(sp => buildBigPartSmallPartRow(sp, cabs)).join('')}</tbody></table>`;
                            currentHeight += 65 + (chunk.length * 34);
                            partIdx += chunk.length;
                        }
                    }
                }
            }

            // --- 5. LAMINATES (Beläge) ---
            if (config.laminates && counts.laminates > 0) {
                const lam = getArray(proj.INTERNALPRODUCTION).filter(p => p.PAN_LAMTOP_MATREF || p.PAN_LAMBOT_MATREF);
                if (lam.length > 0) {
                    tocEntries.push({ title: t("menu.laminates"), page: currentPageNum });
                    // Each buildLaminateRow() generates 2 <tr> rows (rowspan pattern).
                    // Landscape page usable height: 800 - 50pad - 47hdr - 40ftr = ~663px
                    // Per item: 2 rows × 32px = 64px. Header row ~24px. Section title ~28px.
                    // Safe: (663 - 28 - 24) / 64 = ~9.5 → use 9 per page
                    const chunks = chunkArray(lam, 10);
                    chunks.forEach((chunk, idx) => {
                            const p = createPage(`laminates-${idx}`, true);
                            p.innerHTML += `<div class="pdf-section-title">${t("menu.laminates")} ${chunks.length > 1 ? `(${idx+1}/${chunks.length})` : ''}</div><table class="pdf-table laminates-table"><thead><tr><th style="width:50px">${t("th.cabsnr")}</th><th style="width:50px" class="col-center">${t("th.cablist")}</th><th style="width:140px">${t("th.desc")}</th><th style="width:30px" class="col-center">${t("th.ou")}</th><th style="width:120px">${t("th.laminfo")}</th><th style="width:40px" class="col-center">${t("th.l_short")}</th><th style="width:40px" class="col-center">${t("th.w_short")}</th><th style="width:60px" class="col-center">${t("th.lamgrain")}</th><th style="width:80px">${t("th.substratemat")}</th><th style="width:80px" class="col-center">${t("th.substrateraw")}</th><th style="width:50px" class="col-center">${t("th.calibration")}</th><th style="width:100px" class="col-center">${t("th.finishdim")}</th></tr></thead><tbody>${chunk.map(p => buildLaminateRow(p, cabs)).join('')}</tbody></table>`;
                            container.appendChild(p); currentPageNum++;
                    });
                }
            }

            // --- 6. CNC PROGRAMS ---
            if (config.programs && counts.programs > 0) {
                const prog = getArray(proj.INTERNALPRODUCTION).filter(p => getArray(p.PROGRAMS).some(pr => pr.PROG_FILENAME));
                if (prog.length > 0) {
                    tocEntries.push({ title: t("menu.cncprograms"), page: currentPageNum });
                    const chunks = chunkArray(prog, 18);
                    chunks.forEach((chunk, idx) => {
                        const p = createPage(`programs-${idx}`);
                        p.innerHTML += `<div class="pdf-section-title">${t("menu.cncprograms")} ${chunks.length > 1 ? `(${idx+1}/${chunks.length})` : ''}</div><table class="pdf-table"><thead><tr><th style="width:50px">${t("th.cabinets")}</th><th style="width:50px" class="col-center">${t("th.cablistsnr")}</th><th>${t("th.desc")}</th><th style="width:100px">${t("th.matref")}</th><th style="width:60px" class="col-center">${t("th.lxw")}</th><th style="width:30px" class="col-center">${t("th.phase")}</th><th style="width:50px" class="col-center">${t("th.qr")}</th><th style="width:100px">${t("th.cncprogram")}</th><th style="width:50px">${t("th.tools")}</th><th style="width:50px" class="col-center">${t("th.timesec")}</th><th style="width:90px">${t("th.comment")}</th></tr></thead><tbody>${chunk.map(p => buildProgramRow(p, cabs)).join('')}</tbody></table>`;
                        container.appendChild(p); currentPageNum++;
                    });
                }
            }

            // --- 7+8. FITTINGS, FITTINGS LV, PURCHASE — smart same-page packing ---
            {
                // Helper: estimate rendered height of a simple table (header + rows)
                const tableH = (rows) => 30 + rows * 28; // header≈30, each row≈28px

                const fits    = (config.fittings && counts.fittings > 0) ? summarizeItems([...getArray(proj.FITTING), ...getArray(proj.FITTING_EFICAD)]) : [];
                const fitsLV  = (config.fittings && counts.fittings > 0) ? summarizeLVItems(getArray(proj.FITTING_LV)) : [];
                const purch   = (config.purchase && counts.purchase > 0)  ? summarizeItems(getArray(proj.EXTERNALPRODUCTION)) : [];

                // Build table HTML fragments (no page logic yet)
                const PAGE_H = 980; // usable height of a portrait page (header+footer reserved)
                const SEC_GAP = 28; // gap between section title + table

                const fitsHtml   = fits.length   > 0 ? `<div class="pdf-section-title">${t("menu.fittings")}</div><table class="pdf-table"><thead><tr><th>${t("th.desc")}</th><th style="width:40px" class="col-center">${t("th.quantity")}</th><th>${t("th.supplier")}</th><th>${t("th.suppliercode")}</th></tr></thead><tbody>${fits.map(f=>`<tr><td class="text-main">${f.DESCRIPTION||'-'} <span class="text-sub">${f.DESCRIPTION_EXTENDED||''}</span></td><td class="col-center text-main">${f.QUANTITY}</td><td class="text-sub">${f.SUPPLIER||'-'}</td><td class="text-sub">${f.SUPPLIERCODE||'-'}</td></tr>`).join('')}</tbody></table>` : '';
                const fitsLVHtml = fitsLV.length > 0 ? `<div class="pdf-section-title" style="margin-top:16px;">${t("section.fittings_lv")||"Fittings LV"}</div><table class="pdf-table"><thead><tr><th>${t("th.desc")}</th><th style="width:60px" class="col-center">${t("th.length")||"Length"}</th><th style="width:40px" class="col-center">${t("th.quantity")}</th><th>${t("th.supplier")}</th><th>${t("th.suppliercode")}</th></tr></thead><tbody>${fitsLV.map(f=>`<tr><td class="text-main">${f.DESCRIPTION||'-'} <span class="text-sub">${f.DESCRIPTION_EXTENDED||''}</span></td><td class="col-center text-main bold">${f.LENGTH||'-'}</td><td class="col-center text-main">${f.QUANTITY}</td><td class="text-sub">${f.SUPPLIER||'-'}</td><td class="text-sub">${f.SUPPLIERCODE||'-'}</td></tr>`).join('')}</tbody></table>` : '';
                const purchHtml  = purch.length  > 0 ? `<div class="pdf-section-title" style="margin-top:16px;">${t("menu.purchase")}</div><table class="pdf-table"><thead><tr><th>${t("th.desc")}</th><th style="width:40px" class="col-center">${t("th.quantity")}</th><th>${t("th.supplier")}</th><th>${t("th.suppliercode")}</th></tr></thead><tbody>${purch.map(f=>`<tr><td class="text-main">${f.DESCRIPTION||'-'}</td><td class="col-center text-main">${f.QUANTITY}</td><td class="text-sub">${f.SUPPLIER||'-'}</td><td class="text-sub">${f.SUPPLIERCODE||'-'}</td></tr>`).join('')}</tbody></table>` : '';

                const hFits   = fits.length   > 0 ? tableH(fits.length)   + SEC_GAP : 0;
                const hFitsLV = fitsLV.length > 0 ? tableH(fitsLV.length) + SEC_GAP : 0;
                const hPurch  = purch.length  > 0 ? tableH(purch.length)  + SEC_GAP : 0;

                // Register TOC entries before page numbers change
                if (fits.length > 0)   tocEntries.push({ title: t("menu.fittings"),                       page: currentPageNum });
                if (fitsLV.length > 0) tocEntries.push({ title: t("section.fittings_lv")||"Fittings LV", page: currentPageNum });
                if (purch.length > 0)  tocEntries.push({ title: t("menu.purchase"),                       page: currentPageNum });

                // Pack sections greedily onto pages
                if (hFits + hFitsLV + hPurch > 0) {
                    let usedH = 0;
                    let pageHtml = '';
                    const flushPage = (id) => {
                        if (!pageHtml) return;
                        const pg = createPage(id);
                        pg.innerHTML += pageHtml;
                        container.appendChild(pg);
                        currentPageNum++;
                        pageHtml = ''; usedH = 0;
                    };
                    const addSection = (html, h, id) => {
                        if (!html) return;
                        if (usedH > 0 && usedH + h > PAGE_H) flushPage(id + '-cont');
                        pageHtml += html;
                        usedH += h;
                    };
                    addSection(fitsHtml,   hFits,   'fittings-0');
                    addSection(fitsLVHtml, hFitsLV, 'fittings-lv-0');
                    addSection(purchHtml,  hPurch,  'purchase-0');
                    flushPage('fittings-purchase-page');
                }
            }

            // --- 9. SUMMARY ---
            if (config.summary) {
                tocEntries.push({ title: t("menu.summary"), page: currentPageNum });
                const summaries = calculateMaterialSummaries(proj);
                const p = createPage("summary");
                p.innerHTML += `<div class="pdf-section-title">${t("section.material")}</div><table class="pdf-table"><thead><tr><th>${t("th.matref")}</th><th>${t("th.matdesc")}</th><th style="width:70px" class="col-center">${t("th.thickness")}</th><th style="width:80px" class="col-center">${t("th.summary")}</th></tr></thead><tbody>${summaries.matData.map(d => `<tr><td class="text-sub">${d.ref}</td><td class="text-main">${d.desc||''}</td><td class="col-center text-main">${parseFloat(d.t||0).toFixed(2)} mm</td><td class="col-center text-main bold">${d.total.toFixed(2)} m²</td></tr>`).join('')}</tbody></table><div class="pdf-section-title" style="margin-top:20px;">${t("section.edgeband")}</div><table class="pdf-table"><thead><tr><th>${t("th.ebref")}</th><th>${t("th.ebdesc")}</th><th style="width:70px" class="col-center">${t("th.ebthickness")}</th><th style="width:80px" class="col-center">${t("th.summary")}</th></tr></thead><tbody>${summaries.ebData.map(d => `<tr><td class="text-sub">${d.ref}</td><td class="text-main">${d.desc||''}</td><td class="col-center text-main">${parseFloat(d.t||0).toFixed(2)} mm</td><td class="col-center text-main bold">${d.total.toFixed(2)} lm</td></tr>`).join('')}</tbody></table>`;
                
                if (summaries.lamData.length > 0) {
                    p.innerHTML += `<div class="pdf-section-title" style="margin-top:20px;">${t("section.laminate") || "Laminate Summary"}</div><table class="pdf-table"><thead><tr><th>${t("th.lamref") || "Laminate Ref"}</th><th>${t("th.lamdesc") || "Description"}</th><th style="width:70px" class="col-center">${t("th.thickness")}</th><th style="width:80px" class="col-center">${t("th.summary")}</th></tr></thead><tbody>${summaries.lamData.map(d => `<tr><td class="text-sub">${d.ref}</td><td class="text-main">${d.desc || ''}</td><td class="col-center text-main">${parseFloat(d.t || 0).toFixed(2)} mm</td><td class="col-center text-main bold">${d.total.toFixed(2)} ${d.unit}</td></tr>`).join('')}</tbody></table>`;
                }
                
                container.appendChild(p); currentPageNum++;
            }

            const tocHtml = tocEntries.map(e => `<div class="pdf-toc-item ${e.isSub?'sub':''}" style="display:flex;align-items:baseline;justify-content:space-between;font-size:${e.isSub?'8':'9'}px;padding:${e.isSub?'1':'3'}px 0 ${e.isSub?'1':'3'}px ${e.isSub?'16':'0'}px;"><span style="flex:1;font-weight:${e.isSub?'400':'600'};color:${e.isSub?'#64748b':'#0f172a'};">${e.title}</span><span style="flex:0 0 auto;border-bottom:1px dotted #cbd5e1;margin:0 8px;min-width:40px;"></span><span style="flex:0 0 auto;font-weight:700;color:#0f172a;">${e.page}</span></div>`).join('');
            if (tocPage) {
                const list = tocPage.querySelector("#pdf-toc-list-page");
                if (list) list.innerHTML = tocHtml;
            }

            overlayMsg.innerText = t("ui.rendering_page") + "...";
            const jspdfLib = window.jspdf || window.jsPDF || (typeof jsPDF !== 'undefined' ? jsPDF : null);
            const jsPDFClass = jspdfLib ? (jspdfLib.jsPDF || jspdfLib) : (typeof jsPDF !== 'undefined' ? jsPDF : null);
            if (!jsPDFClass) {
                throw new Error("jsPDF library is not loaded.");
            }
            const html2canvasFn = window.html2canvas || (typeof html2canvas !== 'undefined' ? html2canvas : null);
            if (!html2canvasFn) {
                throw new Error("html2canvas library is not loaded.");
            }

            const pdf = new jsPDFClass({ orientation: 'portrait', unit: 'px', format: [800, 1120] });
            const pages = container.querySelectorAll('.pdf-page');
            const totalPages = pages.length;
            pages.forEach((page, index) => {
                const pNum = page.querySelector('.pdf-page-number');
                if (pNum) pNum.innerText = (index + 1) + " / " + totalPages;
            });

            // Render QR Codes
            const qrPlaceholders = container.querySelectorAll('.pdf-prog-qr');
            qrPlaceholders.forEach(el => {
                const val = el.getAttribute('data-val');
                if (val && val !== '-' && window.QRCode) {
                    new window.QRCode(el, { text: val, width: 36, height: 36, correctLevel: window.QRCode.CorrectLevel.L });
                }
            });
            // Brief pause to ensure canvas drawing finishes
            await new Promise(r => setTimeout(r, 100));

            for (let i = 0; i < pages.length; i++) {
                if (overlayMsg) {
                    overlayMsg.innerText = t("ui.rendering_page") + " " + (i + 1) + " / " + pages.length;
                }
                await new Promise(r => setTimeout(r, 40));
                if (i > 0) pdf.addPage([800, 1120], pages[i].classList.contains('landscape') ? 'landscape' : 'portrait');
                const canvas = await html2canvasFn(pages[i], { scale: 2, useCORS: true, allowTaint: true, logging: false });
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            }
            const pdfName = [proj.PRJ_NR, proj.PRJ_POSITION, proj.PRJ_NAME, (proj.REPORT_TYPE||'') + (proj.REPORT_VERSION||'')].filter(Boolean).join('_').replace(/[\\/:*?"<>|]/g,'_') || 'Report';
            pdf.save(pdfName + '.pdf');
            if (overlay) overlay.style.display = 'none';
        } catch (err) { console.error("PDF Error:", err); alert("Error: " + err.message); if (overlay) overlay.style.display = 'none'; }
        finally { if (container) container.remove(); }
    }

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('#pdf-export-btn');
        if (btn) {
            e.preventDefault();
            if (typeof window.showSelectionModal === 'function') {
                window.showSelectionModal();
            }
        }
    });

    // --- Helpers ---
    /** Format a mm dimension value using the current unit format */
    function pdfDim(mmVal, decimals) {
        const mm = parseFloat(mmVal) || 0;
        if (window.AVL_UNITS) return window.AVL_UNITS.formatDim(mm, { decimals: decimals });
        return mm.toFixed(decimals !== undefined ? decimals : 2);
    }

    /** Format a summary value (m², lm, pc) using the current unit format */
    function pdfSummary(val, unit) {
        if (window.AVL_UNITS) return window.AVL_UNITS.formatSummary(val, unit);
        const v = parseFloat(val) || 0;
        return (unit === 'pc') ? Math.round(v) + ' pc' : v.toFixed(3) + (unit ? ' ' + unit : '');
    }
    function summarizeItems(items) {
        const map = {};
        items.forEach(item => {
            const key = ((item.SUPPLIERCODE || '') + '_' + (item.DESCRIPTION || '')).trim();
            if (!map[key]) map[key] = { ...item, QUANTITY: 0 };
            map[key].QUANTITY += parseInt(item.QTY || item.QUANTITY || 1, 10);
        });
        return Object.values(map).sort((a,b) => String(a.DESCRIPTION).localeCompare(String(b.DESCRIPTION)));
    }
    function summarizeLVItems(items) {
        const map = {};
        items.forEach(item => {
            const key = ((item.SUPPLIERCODE || '') + '_' + (item.DESCRIPTION || '') + '_' + (item.LENGTH || '')).trim();
            if (!map[key]) map[key] = { ...item, QUANTITY: 0 };
            map[key].QUANTITY += parseInt(item.QTY || item.QUANTITY || 1, 10);
        });
        return Object.values(map).sort((a,b) => String(a.DESCRIPTION).localeCompare(String(b.DESCRIPTION)));
    }
    function drawEdgeBoxSVG(p) {
        // Exact match to avl-report_panel-table.js HTML formula: s=28, p=2
        const hL = !!(p.PAN_EBL_NAME && String(p.PAN_EBL_NAME).trim()) || !!(p.PAN_EBL_MATREF && p.PAN_EBL_MATREF !== '-');
        const hR = !!(p.PAN_EBR_NAME && String(p.PAN_EBR_NAME).trim()) || !!(p.PAN_EBR_MATREF && p.PAN_EBR_MATREF !== '-');
        const hF = !!(p.PAN_EBF_NAME && String(p.PAN_EBF_NAME).trim()) || !!(p.PAN_EBF_MATREF && p.PAN_EBF_MATREF !== '-'); // Front = bottom
        const hB = !!(p.PAN_EBB_NAME && String(p.PAN_EBB_NAME).trim()) || !!(p.PAN_EBB_MATREF && p.PAN_EBB_MATREF !== '-'); // Back  = top
        const s = 28, pd = 2;
        const active  = (x1,y1,x2,y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>`;
        const inactive = (x1,y1,x2,y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 2" stroke-linecap="round" opacity="0.4"/>`;
        const seg = (x1,y1,x2,y2,on) => on ? active(x1,y1,x2,y2) : inactive(x1,y1,x2,y2);
        return `<div class="edge-svg-container" style="display:inline-block;width:${s}px;height:${s}px;vertical-align:middle;margin:0 auto;position:relative;overflow:visible;box-sizing:border-box;">`
            + `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">`
            + seg(pd,pd, s-pd,pd, hB)     // top  = Back
            + seg(pd,s-pd, s-pd,s-pd, hF) // bottom = Front
            + seg(pd,pd, pd,s-pd, hL)     // left
            + seg(s-pd,pd, s-pd,s-pd, hR) // right
            + `</svg>`
            + `</div>`;
    }
    function buildCabPartRow(ref, p) { return `<tr><td class="col-center text-main">${p.SNR_CABList || '-'}</td><td class="cell-wrap"><span class="text-main bold">${p.DESCRIPTION || '-'}</span><br><span class="text-sub">${p.FILENAME || ''}</span></td><td class="col-center text-main">${ref.QUANTITY || '1'}</td><td class="text-main">${p.PAN_MATREF || '-'}</td><td class="col-center text-main">${pdfDim(p.PAN_LWEB)}</td><td class="col-center text-main">${pdfDim(p.PAN_WWEB)}</td><td class="col-center text-main">${pdfDim(p.PAN_TWL)}</td><td class="edge-cell">${drawEdgeBoxSVG(p)}</td></tr>`; }
    function buildFlatPanelRow(p, cabs) { const cIdx = cabs.findIndex(c => c.SNR_CAB === p.SNR_CAB); const col = getCabColor(cIdx >= 0 ? cIdx : 99); const pgm = (Array.isArray(p.PROGRAMS) && p.PROGRAMS.length > 0 && p.PROGRAMS[0].PROG_FILENAME) ? '●' : '-'; return `<tr><td class="text-main"><span class="cab-dot" style="background:${(p.SNR_CAB==='No CAB'||p.SNR_CAB==='NoCAB')?'#9ca3af':col};"></span> ${p.SNR_CAB || '-'}</td><td class="col-center text-main">${p.SNR_CABList || '-'}</td><td class="cell-wrap"><span class="text-main bold">${p.DESCRIPTION || '-'}</span><br><span class="text-sub">${p.FILENAME || ''}</span></td><td class="text-main">${p.PAN_MATREF || '-'}</td><td class="col-center text-main">${pdfDim(p.PAN_LWEB)}</td><td class="col-center text-main">${pdfDim(p.PAN_WWEB)}</td><td class="col-center text-main">${pdfDim(p.PAN_TWL)}</td><td class="edge-cell">${drawEdgeBoxSVG(p)}</td><td class="text-sub">F: ${p.PAN_EBF_MATREF||'-'}<br>B: ${p.PAN_EBB_MATREF||'-'}<br>R: ${p.PAN_EBR_MATREF||'-'}<br>L: ${p.PAN_EBL_MATREF||'-'}</td><td class="text-sub">${t("ui.lam.o")}: ${p.PAN_LAMTOP_MATREF||'-'}<br>${t("ui.lam.u")}: ${p.PAN_LAMBOT_MATREF||'-'}</td><td class="col-center text-main">${pgm}</td><td class="text-sub">${p.COMMENT || '-'}</td></tr>`; }
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
        
        const s = 20;
        return `<div class="grain-svg-container" style="display:inline-block;width:${s}px;height:${s}px;vertical-align:middle;margin:0 auto;position:relative;overflow:visible;box-sizing:border-box;color:#000000;">`
            + `<svg width="${s}" height="${s}" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">`
            + `<g transform="rotate(${rotation} 12 12)">`
            + `<line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`
            + `<polyline points="7,8 3,12 7,16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`
            + `<polyline points="17,8 21,12 17,16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`
            + `</g>`
            + `</svg>`
            + `</div>`;
    }
    function buildLaminateRow(p, cabs) {
        const cIdx = cabs.findIndex(c => c.SNR_CAB === p.SNR_CAB);
        const col = getCabColor(cIdx >= 0 ? cIdx : 99);
        const cabCell = `<td rowspan="2" class="text-main"><span class="cab-dot" style="background:${(p.SNR_CAB==='No CAB'||p.SNR_CAB==='NoCAB')?'#9ca3af':col};"></span> ${p.SNR_CAB || '-'}</td>`;
        const snrCell = `<td rowspan="2" class="col-center text-main">${p.SNR_CABList || '-'}</td>`;
        const descCell = `<td rowspan="2" class="cell-wrap"><span class="text-main bold">${p.DESCRIPTION || '-'}</span><br><span class="text-sub">${p.FILENAME || ''}</span></td>`;
        const subMat = `<td rowspan="2" class="text-main">${p.PAN_MATREF || '-'}</td>`;
        const subRaw = `<td rowspan="2" class="col-center text-main">${pdfDim(p.PAN_LWEB)} × ${pdfDim(p.PAN_WWEB)}</td>`;
        const calibVal = (parseFloat(p.PAN_MAT_T || 0) + parseFloat(p.PAN_LAMTOP_ST_T || 0) + parseFloat(p.PAN_LAMBOT_ST_T || 0) - parseFloat(p.PAN_TWL || 0));
        const calib = `<td rowspan="2" class="col-center text-main">${pdfDim(calibVal)}</td>`;
        const finDims = `<td rowspan="2" class="col-center text-main">${pdfDim(p.PAN_LWEB)} × ${pdfDim(p.PAN_WWEB)} × ${pdfDim(p.PAN_TWL)}</td>`;
        
        const tLam = p.PAN_LAMTOP_MATREF && p.PAN_LAMTOP_MATREF !== '-' ? p.PAN_LAMTOP_MATREF : '-';
        const tGrainDeg = (p.PAN_LAMTOP_ST_ANGLEINPANEL !== undefined && p.PAN_LAMTOP_ST_ANGLEINPANEL !== '') ? p.PAN_LAMTOP_ST_ANGLEINPANEL : '0';
        const tGrainCell = `<td class="col-center text-main" style="vertical-align:middle;padding:4px 2px !important;"><div style="display:flex;align-items:center;justify-content:center;">${drawGrainSVG(tGrainDeg)}</div></td>`;
        const tRow = `<tr>${cabCell}${snrCell}${descCell}<td class="col-center text-main bold">${t("ui.lam.o")}</td><td class="text-main">${tLam}</td><td class="col-center text-main">${pdfDim(p.PAN_LWEB)}</td><td class="col-center text-main">${pdfDim(p.PAN_WWEB)}</td>${tGrainCell}${subMat}${subRaw}${calib}${finDims}</tr>`;
        
        const bLam = p.PAN_LAMBOT_MATREF && p.PAN_LAMBOT_MATREF !== '-' ? p.PAN_LAMBOT_MATREF : '-';
        const bGrainDeg = (p.PAN_LAMBOT_ST_ANGLEINPANEL !== undefined && p.PAN_LAMBOT_ST_ANGLEINPANEL !== '') ? p.PAN_LAMBOT_ST_ANGLEINPANEL : '0';
        const bGrainCell = `<td class="col-center text-main" style="vertical-align:middle;padding:4px 2px !important;"><div style="display:flex;align-items:center;justify-content:center;">${drawGrainSVG(bGrainDeg)}</div></td>`;
        const bRow = `<tr><td class="col-center text-main bold">${t("ui.lam.u")}</td><td class="text-main">${bLam}</td><td class="col-center text-main">${pdfDim(p.PAN_LWEB)}</td><td class="col-center text-main">${pdfDim(p.PAN_WWEB)}</td>${bGrainCell}</tr>`;
        return tRow + bRow;
    }
    function buildProgramRow(p, cabs) { const cIdx = cabs.findIndex(c => c.SNR_CAB === p.SNR_CAB); const col = getCabColor(cIdx >= 0 ? cIdx : 99); const pr = Array.isArray(p.PROGRAMS) ? p.PROGRAMS[0] : (p.PROGRAMS || {}); const phase = pr.PROG_PHASENAME || (String(pr.PROG_FILENAME).includes('_A') ? 'A' : (String(pr.PROG_FILENAME).includes('_B') ? 'B' : '-')); return `<tr><td class="text-main"><span class="cab-dot" style="background:${(p.SNR_CAB==='No CAB'||p.SNR_CAB==='NoCAB')?'#9ca3af':col};"></span> ${p.SNR_CAB || '-'}</td><td class="col-center text-main">${p.SNR_CABList || '-'}</td><td class="cell-wrap"><span class="text-main bold">${p.DESCRIPTION || '-'}</span><br><span class="text-sub">${p.FILENAME || ''}</span></td><td class="text-main">${p.PAN_MATREF || '-'}</td><td class="col-center text-main">${pdfDim(p.PAN_LWEB)} × ${pdfDim(p.PAN_WWEB)}</td><td class="col-center text-main">${phase}</td><td class="col-center"><div class="pdf-prog-qr" data-val="${pr.PROG_FILENAME || p.FILENAME}"></div></td><td class="text-main">${pr.PROG_FILENAME || '-'}</td><td class="text-main">${pr.PROG_TOOLS || pr.TOOLS || '-'}</td><td class="col-center text-main">${pr.PROG_TIME || pr.TIME || '-'}</td><td class="text-sub">${p.COMMENT || '-'}</td></tr>`; }
    function buildBigPartSmallPartRow(sp, cabs) {
        const cIdx = cabs.findIndex(c => c.SNR_CAB === sp.SNR_CAB);
        const col = getCabColor(cIdx >= 0 ? cIdx : 99);
        return `<tr>
            <td class="col-center text-main bold">${sp.SPINDEX || '-'}</td>
            <td class="cell-wrap"><span class="text-main bold">${sp.DESCRIPTION || '-'}</span><br><span class="text-sub">${sp.FILENAME || ''}</span></td>
            <td class="col-center text-main">${pdfDim(sp.PAN_LWEB||sp.L)}</td>
            <td class="col-center text-main">${pdfDim(sp.PAN_WWEB||sp.W)}</td>
            <td class="col-center text-main">${pdfDim(sp.PAN_TWL||sp.T)}</td>
            <td class="edge-cell">${drawEdgeBoxSVG(sp)}</td>
            <td class="text-main"><span class="cab-dot" style="background:${(sp.SNR_CAB==='No CAB'||sp.SNR_CAB==='NoCAB')?'#9ca3af':col};"></span> ${sp.SNR_CAB || '-'}</td>
            <td class="text-sub">${sp.SNR_CABList || '-'}</td>
        </tr>`;
    }
    function renderLegendItem(label, count, color) { if (count < 0) return ''; return `<div style="display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#1e293b;padding:2px 0;"><div style="display:flex;align-items:center;gap:8px;"><span style="width:8px;height:8px;background-color:${color};border-radius:50%;display:inline-block;"></span><span style="font-weight:600;">${label}</span></div><span style="font-weight:700;color:#0f172a;">${count}</span></div>`; }
    function createPage(id, isLand = false) {
        const p = document.createElement('div');
        p.id = id;
        p.className = 'pdf-page' + (isLand ? ' landscape' : '');
        const proj = reportData.Project;
        const pdfName = [proj.PRJ_NR, proj.PRJ_POSITION, proj.PRJ_NAME, (proj.REPORT_TYPE||'') + (proj.REPORT_VERSION||'')].filter(Boolean).join('_').replace(/[\\/:*?"<>|]/g,'_') || 'Report';
        p.innerHTML = `<div class="pdf-header"><img src="${LOGO_COMPACT}" class="pdf-header-logo"/><span class="pdf-header-title">${t("pdf.header.title") || "AV-LINE PROJECT REPORT"}</span></div><div class="pdf-footer"><div class="pdf-footer-item"><span class="pdf-footer-label">${t("pdf.footer.project") || "Project"}:</span> ${pdfName}</div><div class="pdf-footer-item"><span class="pdf-footer-label">${t("pdf.footer.file") || "File"}:</span> ${proj.FILENAME || '-'}</div></div><span class="pdf-page-number"></span>`;
        return p;
    }
    function createMetaItem(l, v) { return `<div class="pdf-metadata-item"><div class="pdf-meta-label">${l}</div><div class="pdf-meta-value">${v || '-'}</div></div>`; }
    function chunkArray(a, s) { const r = []; for (let i=0; i<a.length; i+=s) r.push(a.slice(i, i+s)); return r; }
    function getCabColor(i) { const p=['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#EC4899','#84CC16','#14B8A6','#A855F7','#6366F1','#F43F5E','#0EA5E9','#D97706']; return p[i % p.length]; }
    function sortArrayBySNR(arr, key) { return (arr || []).sort((a,b) => String(a[key]==='No CAB'?'ZZZ':a[key]).localeCompare(String(b[key]==='No CAB'?'ZZZ':b[key]), undefined, {numeric:true})); }
    async function loadImageToBase64(u) { return new Promise(r => { const i=new Image(); i.crossOrigin="Anonymous"; i.onload=()=>{ const c=document.createElement("canvas"); c.width=i.width; c.height=i.height; c.getContext("2d").drawImage(i,0,0); r(c.toDataURL("image/jpeg")); }; i.onerror=()=>r(null); i.src=u; }); }
    function calculateMaterialSummaries(proj) {
        const m={}, e={}, l={}, get=(v)=>Array.isArray(v)?v:(v?[v]:[]);
        const useFactor = true;

        // Build exclusion sets (same logic as summary-tables.js)
        const smallPartSet = new Set();
        get(proj.SMALLPART).forEach(sp => { if (sp.FILENAME) smallPartSet.add(sp.FILENAME.trim().toUpperCase()); });
        const bigPartFilenames = new Set();
        get(proj.BIGPART).forEach(bp => { if (bp.FILENAME) bigPartFilenames.add(bp.FILENAME.trim().toUpperCase()); });
        get(proj.BIGPART_ASSEMBLY).forEach(bpa => { if (bpa.FILENAME) bigPartFilenames.add(bpa.FILENAME.trim().toUpperCase()); });

        // Build allParts: filtered INTERNALPRODUCTION + mapped BIGPARTs
        const allParts = [];
        get(proj.INTERNALPRODUCTION).forEach(p => {
            const fn = (p.FILENAME || "").trim().toUpperCase();
            if (!smallPartSet.has(fn) && !bigPartFilenames.has(fn)) allParts.push(p);
        });
        get(proj.BIGPART).forEach(bp => {
            allParts.push({
                QTY: bp.QUANTITY || bp.QTY || 1,
                PAN_MATREF: bp.BP_MATREF, PAN_MATDESC: bp.BP_MATDESC || bp.BP_MATREF,
                PAN_LWEB: bp.BP_L, PAN_WWEB: bp.BP_W,
                PAN_LAMTOP_MATREF: bp.BP_LAMTOP, PAN_LAMTOP_DESC: bp.BP_LAMTOP_DESC || bp.BP_LAMTOP || "",
                PAN_LAMTOP_ST_T: bp.BP_LAMTOP_ST_T || "0", PAN_LAMTOP_ST_L: bp.BP_L, PAN_LAMTOP_ST_W: bp.BP_W,
                PAN_LAMTOP_MATCOSTTYPE: bp.BP_LAMTOP_MATCOSTTYPE || "1", PAN_LAMTOP_MATCOSTFACTOR: bp.BP_LAMTOP_MATCOSTFACTOR || "1",
                PAN_LAMBOT_MATREF: bp.BP_LAMBOT, PAN_LAMBOT_DESC: bp.BP_LAMBOT_DESC || bp.BP_LAMBOT || "",
                PAN_LAMBOT_ST_T: bp.BP_LAMBOT_ST_T || "0", PAN_LAMBOT_ST_L: bp.BP_L, PAN_LAMBOT_ST_W: bp.BP_W,
                PAN_LAMBOT_MATCOSTTYPE: bp.BP_LAMBOT_MATCOSTTYPE || "1", PAN_LAMBOT_MATCOSTFACTOR: bp.BP_LAMBOT_MATCOSTFACTOR || "1",
                PAN_EBL_NAME: "", PAN_EBR_NAME: "", PAN_EBF_NAME: "", PAN_EBB_NAME: ""
            });
        });

        allParts.forEach(p => {
            const q = parseInt(p.QTY || p.QUANTITY || 1);
            if (p.PAN_MATREF) { const a = (parseFloat(p.PAN_LWEB||0) * parseFloat(p.PAN_WWEB||0))/1000000*q; if(!m[p.PAN_MATREF]) m[p.PAN_MATREF]={ref:p.PAN_MATREF,desc:p.PAN_MATDESC,t:p.PAN_MAT_T||'',total:0}; m[p.PAN_MATREF].total+=a; }
            ['EBL','EBR','EBF','EBB'].forEach(s => { const r = p[`PAN_${s}_MATREF`]; if(r && r !== '-'){ const len = (s.includes('L')||s.includes('R') ? parseFloat(p.PAN_LWEB||0) : parseFloat(p.PAN_WWEB||0))/1000*q; if(!e[r]) e[r]={ref:r,desc:p[`PAN_${s}_NAME`],t:p[`PAN_${s}_T`]||'',total:0}; e[r].total+=len; } });
            
            const laminates = [
                { ref: p.PAN_LAMTOP_MATREF, desc: p.PAN_LAMTOP_DESC || "", t: p.PAN_LAMTOP_ST_T,
                  len: parseFloat(p.PAN_LAMTOP_ST_L) || 0, w: parseFloat(p.PAN_LAMTOP_ST_W) || 0,
                  type: p.PAN_LAMTOP_MATCOSTTYPE, factor: (parseFloat(p.PAN_LAMTOP_MATCOSTFACTOR)||1) },
                { ref: p.PAN_LAMBOT_MATREF, desc: p.PAN_LAMBOT_DESC || "", t: p.PAN_LAMBOT_ST_T,
                  len: parseFloat(p.PAN_LAMBOT_ST_L) || 0, w: parseFloat(p.PAN_LAMBOT_ST_W) || 0,
                  type: p.PAN_LAMBOT_MATCOSTTYPE, factor: (parseFloat(p.PAN_LAMBOT_MATCOSTFACTOR)||1) }
            ];
            
            laminates.forEach(lam => {
                if (lam.ref && lam.ref !== '-') {
                    let qty = 0, unit = "", stt = parseFloat(lam.t) || 0;
                    if (lam.type === "0" || lam.type === 0) { qty = (lam.len * lam.w * stt) / 1000000000; unit = "m³"; }
                    else if (lam.type === "2" || lam.type === 2) { qty = lam.len / 1000; unit = "lm"; }
                    else if (lam.type === "3" || lam.type === 3) { qty = 1; unit = "pc"; }
                    else { qty = (lam.len * lam.w) / 1000000; unit = "m²"; }
                    qty = qty * lam.factor * q;
                    if (!l[lam.ref]) {
                        l[lam.ref] = { ref: lam.ref, desc: lam.desc, t: lam.t || "", unit: unit, total: 0 };
                    } else {
                        const currentT = parseFloat(l[lam.ref].t) || 0;
                        const newT = parseFloat(lam.t) || 0;
                        if (newT > currentT) l[lam.ref].t = lam.t || "";
                        // Fill desc from later occurrence if currently empty
                        if (!l[lam.ref].desc && lam.desc) l[lam.ref].desc = lam.desc;
                    }
                    l[lam.ref].total += qty;
                }
            });
        });
        const f = (o) => Object.values(o).sort((a,b)=>b.total-a.total); 
        return { matData: f(m), ebData: f(e), lamData: f(l) };
    }
