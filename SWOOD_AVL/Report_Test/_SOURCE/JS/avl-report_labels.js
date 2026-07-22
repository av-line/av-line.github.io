// avl-report_labels.js — AV-Line Production Label Renderer (100×50mm)
// Depends on: QRCode (qrcode.min.js), reportData

(function () {

    // ── QR Code helper (uses qrcodejs library, renders to canvas then img) ──────
    function generateQR(text, targetEl) {
        if (!text || typeof QRCode === 'undefined') {
            targetEl.innerHTML = `<div class="lbl-qr-empty">—</div>`;
            return;
        }
        targetEl.innerHTML = '';
        try {
            new QRCode(targetEl, {
                text: text,
                width:  104,
                height: 104,
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch(e) {
            targetEl.innerHTML = `<div class="lbl-qr-empty" title="${text}">QR</div>`;
        }
    }

    // ── Build the label HTML skeleton ──────────────────────────────────────────
    function buildLabelHTML(data) {
        const proj  = (typeof reportData !== 'undefined') ? reportData.Project : {};

        // -- Info values --
        const project   = proj.PRJ_NAME    || '—';
        const prjNr     = proj.PRJ_NR      || '';
        const prjPos    = proj.PRJ_POSITION || '';
        const cusName   = proj.CUS_NAME    || '';
        const snrCab    = data.SNR_CAB     || '—';
        const snrList   = data.SNR_CABList || '—';
        const partName  = data.FILENAME    || '—';
        const desc      = data.DESCRIPTION || '—';
        const cabDesc   = data._cabDesc    || '';          // cabinet description for the ref panel
        const comment   = data.COMMENT     || '';

        // -- Dimensions --
        const l   = parseFloat(data.PAN_LWEB) || 0;
        const b   = parseFloat(data.PAN_WWEB) || 0;
        const d   = data.PAN_TWL  || '—';
        const rl  = data.PAN_STL  || '—';
        const rb  = data.PAN_STW  || '—';
        const rd  = data.PAN_STT  || '—';

        // -- Rotation: rotate image 90° right when width (b) > length (l) --
        const doRotate = b > l && l > 0;

        // -- Materials --
        const matRef    = data.PAN_MATREF       || '';
        const lamTop    = data.PAN_LAMTOP_MATREF || '';
        const lamBot    = data.PAN_LAMBOT_MATREF || '';

        // -- Image path: relative from HTML subfolder --
        let imgSrc = `../IMG/Labels/${data.FILENAME}_Label.jpg`;
        if (data.LABEL_IMG_BASE64) {
            imgSrc = data.LABEL_IMG_BASE64.startsWith('data:') 
                ? data.LABEL_IMG_BASE64 
                : 'data:image/jpeg;base64,' + data.LABEL_IMG_BASE64;
        }

        // -- QR programs: take up to 2 programs that have a PROG_FILENAME --
        const programs = Array.isArray(data.PROGRAMS) ? data.PROGRAMS : [];
        const qrProgs  = programs.filter(p => p.PROG_FILENAME && p.PROG_FILENAME.trim()).slice(0, 2);

        // -- Edgeband matrefs --
        const ebF = data.PAN_EBF_MATREF ? data.PAN_EBF_MATREF.trim() : '';
        const ebB = data.PAN_EBB_MATREF ? data.PAN_EBB_MATREF.trim() : '';
        const ebL = data.PAN_EBL_MATREF ? data.PAN_EBL_MATREF.trim() : '';
        const ebR = data.PAN_EBR_MATREF ? data.PAN_EBR_MATREF.trim() : '';

        // -- Cabinet colour dot --
        const cabColors = [
            'var(--color-cab-0)','var(--color-cab-1)','var(--color-cab-2)','var(--color-cab-3)','var(--color-cab-4)',
            'var(--color-cab-5)','var(--color-cab-6)','var(--color-cab-7)','var(--color-cab-8)','var(--color-cab-9)',
            'var(--color-cab-10)','var(--color-cab-11)','var(--color-cab-12)','var(--color-cab-13)','var(--color-cab-14)'
        ];
        const cabColor = (data._cabIdx === null || data._cabIdx === undefined || data._cabIdx < 0) ? 'var(--color-cab-nocab)' : cabColors[(data._cabIdx ?? 0) % cabColors.length];

        // -- Rotation badge (Material Symbols rotate_right) shown top-left of image area when rotated --
        const rotateBadge = doRotate
            ? `<div class="lbl-rotate-badge" title="Image rotated 90° right">
                   <span class="material-symbols-rounded">rotate_right</span>
               </div>`
            : '';

        // -- Dimension display strings formatted by unit engine --
        const fmt = (v) => (window.AVL_UNITS && v != null && String(v).trim() !== '' && String(v).trim() !== '—') ? window.AVL_UNITS.formatDim(v) : (v || '—');
        const lStr  = fmt(data.PAN_LWEB);
        const bStr  = fmt(data.PAN_WWEB);
        const dStr  = fmt(data.PAN_TWL);
        const rlStr = fmt(data.PAN_STL);
        const rbStr = fmt(data.PAN_STW);
        const rdStr = fmt(data.PAN_STT);

        return `
        <div class="lbl-root" id="lbl-render">

            <!-- ══ TOP STRIP ══════════════════════════════════════════════════ -->
            <div class="lbl-top">

                <!-- Left: Project / Desc / Comment — always top-aligned -->
                <div class="lbl-top-info">
                    <div class="lbl-prjnr">${prjNr}${prjPos ? ' | ' + prjPos : ''}</div>
                    <div class="lbl-project">${project}</div>
                    <div class="lbl-cusname ${cusName ? '' : 'lbl-field-placeholder'}">${cusName || '—'}</div>
                    <div class="lbl-desc">${desc}</div>
                    <div class="lbl-comment ${comment ? '' : 'lbl-field-placeholder'}">${comment || '—'}</div>
                </div>

                <!-- Center: Cabinet + List refs -->
                <div class="lbl-top-refs">
                    <div class="lbl-ref-row lbl-partname">
                        <span class="lbl-ref-val">${cabDesc || desc}</span>
                    </div>
                    <div class="lbl-ref-row">
                        <span class="lbl-ref-icon" style="background:${cabColor};"></span>
                        <span class="lbl-ref-val">${snrCab}</span>
                    </div>
                    <div class="lbl-ref-row">
                        <span class="lbl-ref-label">List</span>
                        <span class="lbl-ref-val lbl-ref-list">${snrList}</span>
                    </div>
                    <div class="lbl-ref-row">
                        <span class="lbl-ref-label">ID</span>
                        <span class="lbl-ref-val lbl-id-val">${partName}</span>
                    </div>
                </div>

                <!-- Right: QR codes -->
                <div class="lbl-top-qr">
                    <div class="lbl-qr-wrap">
                        <div class="lbl-qr-box" id="lbl-qr1"
                             data-qr="${qrProgs[0] ? qrProgs[0].PROG_FILENAME : ''}">
                        </div>
                        <div class="lbl-qr-label">${qrProgs[0] ? (qrProgs[0].PROG_FILENAME || '') : 'No program'}</div>
                    </div>
                    <div class="lbl-qr-wrap">
                        <div class="lbl-qr-box" id="lbl-qr2"
                             data-qr="${qrProgs[1] ? qrProgs[1].PROG_FILENAME : ''}">
                        </div>
                        <div class="lbl-qr-label">${qrProgs[1] ? (qrProgs[1].PROG_FILENAME || '') : 'No program'}</div>
                    </div>
                </div>

            </div><!-- /lbl-top -->

            <!-- ══ BOTTOM SECTION ═════════════════════════════════════════════ -->
            <div class="lbl-bottom">

                <!-- Left 60%: Panel image -->
                <div class="lbl-img-zone">
                    ${rotateBadge}
                    <img src="${imgSrc}"
                         data-rawsrc="${imgSrc}"
                         alt="${desc}"
                         class="lbl-img${doRotate ? ' lbl-img-rotated' : ''}"
                         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                    <div class="lbl-img-fallback">
                        <span class="material-symbols-rounded">image_not_supported</span>
                        <span>${data.FILENAME}</span>
                    </div>
                </div>

                <!-- Right 40%: Dimensions + Materials + Edgebands -->
                <div class="lbl-info-zone">

                    <div class="lbl-dim-block">
                        <div class="lbl-dim-row lbl-dim-finished">
                            <span class="lbl-dim-label">L×B×D</span>
                            <span class="lbl-dim-val">${lStr} × ${bStr} × ${dStr}</span>
                        </div>
                        <div class="lbl-dim-row lbl-dim-raw">
                            <span class="lbl-dim-label">RL×RB×RD</span>
                            <span class="lbl-dim-val">${rlStr} × ${rbStr} × ${rdStr}</span>
                        </div>
                    </div>

                    <div class="lbl-mat-divider"></div>

                    <div class="lbl-mat-block">
                        <div class="lbl-mat-row ${lamTop ? '' : 'lbl-mat-empty'}">
                            <span class="lbl-mat-icon lbl-mat-top">⊤</span>
                            <span class="lbl-mat-val">${lamTop || '—'}</span>
                        </div>
                        <div class="lbl-mat-row lbl-mat-core">
                            <span class="lbl-mat-icon lbl-mat-mid">▪</span>
                            <span class="lbl-mat-val lbl-mat-bold">${matRef || '—'}</span>
                        </div>
                        <div class="lbl-mat-row ${lamBot ? '' : 'lbl-mat-empty'}">
                            <span class="lbl-mat-icon lbl-mat-bot">⊥</span>
                            <span class="lbl-mat-val">${lamBot || '—'}</span>
                        </div>
                    </div>

                    <div class="lbl-mat-divider"></div>

                    <div class="lbl-eb-block">
                        <div class="lbl-mat-row ${ebF ? '' : 'lbl-mat-empty'}">
                            <span class="lbl-mat-icon lbl-eb-icon">F</span>
                            <span class="lbl-mat-val">${ebF || '—'}</span>
                        </div>
                        <div class="lbl-mat-row ${ebB ? '' : 'lbl-mat-empty'}">
                            <span class="lbl-mat-icon lbl-eb-icon">B</span>
                            <span class="lbl-mat-val">${ebB || '—'}</span>
                        </div>
                        <div class="lbl-mat-row ${ebL ? '' : 'lbl-mat-empty'}">
                            <span class="lbl-mat-icon lbl-eb-icon">L</span>
                            <span class="lbl-mat-val">${ebL || '—'}</span>
                        </div>
                        <div class="lbl-mat-row ${ebR ? '' : 'lbl-mat-empty'}">
                            <span class="lbl-mat-icon lbl-eb-icon">R</span>
                            <span class="lbl-mat-val">${ebR || '—'}</span>
                        </div>
                    </div>

                </div>
            </div><!-- /lbl-bottom -->

        </div><!-- /lbl-root -->`;
    }

    // ── CSS injected once ──────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('lbl-styles')) return;
        const style = document.createElement('style');
        style.id = 'lbl-styles';
        style.textContent = `
/* ══════════════════════════════════════════════
   Label Root — 100×50mm @ 96dpi = 378×189px
   We render at 2× for crispness: 756×378px
══════════════════════════════════════════════ */
.lbl-root {
    width:  756px;
    height: 378px;
    border: 1px solid var(--color-border-hr);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: 'Inter', 'Outfit', sans-serif;
    font-size: 13px;
    color: var(--color-text-primary);
    background: var(--color-bg-sidebar);
    box-shadow: 0 4px 24px var(--color-shadow);
    flex-shrink: 0;
}

/* ── Top strip ──────────────────────────────── */
.lbl-top {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--color-border-hr);
    height: 130px;
    flex-shrink: 0;
}

/* Left: project info — always top-aligned, stable positions */
.lbl-top-info {
    flex: 1 1 0;
    padding: 7px 10px 6px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 0;
    border-right: 1px solid var(--color-bg-secondary);
    overflow: hidden;
}
.lbl-project {
    font-weight: 700;
    font-size: 13px;
    color: var(--color-active-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
}
/* Part description — bold, always at fixed row 4 */
.lbl-desc {
    font-size: 14px;
    font-weight: 700;
    margin-top: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.lbl-comment {
    font-size: 11px;
    color: var(--color-text-placeholder);
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
/* Placeholder rows render at same height but invisible */
.lbl-field-placeholder {
    opacity: 0;
    pointer-events: none;
}
.lbl-prjnr {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-text-placeholder);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.lbl-cusname {
    font-size: 11px;
    color: var(--color-text-placeholder);
    font-weight: 500;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.lbl-id-val {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-placeholder);
}

/* Center: refs */
.lbl-top-refs {
    width: 160px;
    flex-shrink: 0;
    padding: 7px 10px 6px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 4px;
    border-right: 1px solid var(--color-bg-secondary);
}
.lbl-ref-row {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
}
.lbl-ref-icon {
    width: 10px; height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
}
.lbl-ref-label {
    font-size: 10px;
    color: var(--color-text-placeholder);
    width: 22px;
    flex-shrink: 0;
}
.lbl-ref-val {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
/* Cabinet description above SNR_CAB — smaller, muted */
.lbl-partname .lbl-ref-val {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-placeholder);
}
/* List ID — bold, prominent */
.lbl-ref-list {
    font-weight: 700;
    font-size: 13px;
}

/* Right: QR zone — wider, larger QR boxes */
.lbl-top-qr {
    flex: 0 0 40%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 8px 14px;
    flex-shrink: 0;
    border-left: 1px solid var(--color-bg-secondary);
}
.lbl-qr-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    flex: 1;
}
.lbl-qr-box {
    width: 104px; height: 104px;
    border: 1px solid var(--color-bg-secondary);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #fff;
}
.lbl-qr-box canvas { display: block; }
.lbl-qr-box img    { display: block; }
.lbl-qr-empty {
    font-size: 11px;
    color: var(--color-text-placeholder);
    text-align: center;
    padding: 4px;
}
.lbl-qr-label {
    font-size: 9.5px;
    color: var(--color-text-placeholder);
    font-weight: 600;
    letter-spacing: 0.03em;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 108px;
}

/* ── Bottom section ────────────────────────── */
.lbl-bottom {
    display: flex;
    flex: 1;
    overflow: hidden;
}

/* Image zone 60% */
.lbl-img-zone {
    flex: 0 0 60%;
    position: relative;
    overflow: hidden;
    border-right: 1px solid var(--color-border-hr);
    background: var(--color-bg-primary);
}

/* Normal image */
.lbl-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    padding: 4px;
    box-sizing: border-box;
}

/* Rotated image: rotate 90° clockwise, scale to fill container */
.lbl-img-rotated {
    position: absolute;
    top: 50%;
    left: 50%;
    /* The image zone is ~454×248px (60% of 756 wide, 248 tall).
       Swap width/height so the rotated image fits the zone. */
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%) rotate(90deg);
    object-fit: contain;
    padding: 4px;
    box-sizing: border-box;
}

/* Rotate badge — top-left corner of image area */
.lbl-rotate-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    color: #000;
    filter: drop-shadow(0 1px 2px rgba(255,255,255,0.7));
}
.lbl-rotate-badge .material-symbols-rounded {
    font-size: 18px;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;
}

.lbl-img-fallback {
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 6px;
    color: var(--color-text-placeholder);
    font-size: 12px;
}
.lbl-img-fallback .material-symbols-rounded { font-size: 36px; opacity: 0.4; }

/* Info zone 40% */
.lbl-info-zone {
    flex: 0 0 40%;
    display: flex;
    flex-direction: column;
    padding: 8px 10px;
    gap: 0;
    overflow: hidden;
}

/* Dimensions */
.lbl-dim-block { display: flex; flex-direction: column; gap: 4px; }
.lbl-dim-row {
    display: flex;
    flex-direction: column;
    gap: 1px;
}
.lbl-dim-label {
    font-size: 10px;
    color: var(--color-text-placeholder);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}
.lbl-dim-val {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.02em;
}
.lbl-dim-raw .lbl-dim-val {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-placeholder);
}

.lbl-mat-divider {
    height: 1px;
    background: var(--color-border-hr);
    margin: 7px 0;
}

/* Materials */
.lbl-mat-block { display: flex; flex-direction: column; gap: 3px; }
.lbl-mat-row {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
}
.lbl-mat-empty { opacity: 0.35; }
.lbl-mat-icon {
    width: 14px;
    text-align: center;
    font-size: 11px;
    flex-shrink: 0;
    color: var(--color-text-placeholder);
}
.lbl-mat-top  { color: #06B6D4; }
.lbl-mat-mid  { color: var(--color-active-primary); }
.lbl-mat-bot  { color: #F59E0B; }
.lbl-mat-val {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11px;
}
/* Core material row — larger and more prominent */
.lbl-mat-core .lbl-mat-val {
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 0.01em;
}
.lbl-mat-bold { font-weight: 700; font-size: 13.5px; }

/* Edgeband block */
.lbl-eb-block { display: flex; flex-direction: column; gap: 2px; }
.lbl-eb-icon {
    font-size: 10px;
    font-weight: 700;
    font-style: normal;
    color: var(--color-text-placeholder);
    width: 14px;
    text-align: center;
    flex-shrink: 0;
    font-family: monospace;
    letter-spacing: 0;
}

/* ── Label preview wrapper inside modal ────── */
.lbl-modal-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 4px 0 8px;
}
.lbl-modal-caption {
    font-size: 0.82em;
    color: var(--color-text-placeholder);
    text-align: center;
    letter-spacing: 0.04em;
}
        `;
        document.head.appendChild(style);
    }

    // ── Public render function ─────────────────────────────────────────────────
    window.renderLabel = function(data, containerEl) {
        injectStyles();
        containerEl.innerHTML = `<div class="lbl-modal-wrapper">
            ${buildLabelHTML(data)}
        </div>`;

        // Generate QR codes after DOM is painted
        requestAnimationFrame(() => {
            const box1 = containerEl.querySelector('#lbl-qr1');
            const box2 = containerEl.querySelector('#lbl-qr2');
            if (box1) generateQR(box1.dataset.qr, box1);
            if (box2) generateQR(box2.dataset.qr, box2);

            const imgEl = containerEl.querySelector('.lbl-img');
            if (imgEl && imgEl.dataset.rawsrc && !imgEl.dataset.rawsrc.startsWith('data:')) {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', imgEl.dataset.rawsrc, true);
                xhr.responseType = 'blob';
                xhr.onload = () => {
                    if ((xhr.status === 200 || xhr.status === 0) && xhr.response && xhr.response.size > 0) {
                        const url = URL.createObjectURL(xhr.response);
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
                                topLoop: for (let y = 0; y < c.height; y++) { for (let x = 0; x < c.width; x++) { if (!isBg((y * c.width + x) * 4)) { top = y; break topLoop; } } }
                                if (top !== c.height) {
                                    bottomLoop: for (let y = c.height - 1; y >= 0; y--) { for (let x = 0; x < c.width; x++) { if (!isBg((y * c.width + x) * 4)) { bottom = y; break bottomLoop; } } }
                                    leftLoop: for (let x = 0; x < c.width; x++) { for (let y = 0; y < c.height; y++) { if (!isBg((y * c.width + x) * 4)) { left = x; break leftLoop; } } }
                                    rightLoop: for (let x = c.width - 1; x >= 0; x--) { for (let y = 0; y < c.height; y++) { if (!isBg((y * c.width + x) * 4)) { right = x; break rightLoop; } } }
                                    const pad = 2;
                                    top = Math.max(0, top - pad); bottom = Math.min(c.height, bottom + pad);
                                    left = Math.max(0, left - pad); right = Math.min(c.width, right + pad);
                                    const cropW = right - left; const cropH = bottom - top;
                                    const cc = document.createElement('canvas');
                                    cc.width = cropW; cc.height = cropH;
                                    cc.getContext('2d').drawImage(c, left, top, cropW, cropH, 0, 0, cropW, cropH);
                                    imgEl.src = cc.toDataURL('image/jpeg', 0.9);
                                    imgEl.style.objectFit = 'contain';
                                }
                            } catch(e) {}
                            URL.revokeObjectURL(url);
                        };
                        img.onerror = () => URL.revokeObjectURL(url);
                        img.src = url;
                    }
                };
                xhr.onerror = () => {};
                xhr.send();
            }
        });
    };

})();
