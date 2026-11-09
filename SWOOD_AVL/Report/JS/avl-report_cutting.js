// avl-report_cutting.js — AV-Line Cutting Optimization Engine + Interactive Cut List
(function () {

const COLORS = [
    'var(--color-cab-0)','var(--color-cab-1)','var(--color-cab-2)','var(--color-cab-3)','var(--color-cab-4)',
    'var(--color-cab-5)','var(--color-cab-6)','var(--color-cab-7)','var(--color-cab-8)','var(--color-cab-9)',
    'var(--color-cab-10)','var(--color-cab-11)','var(--color-cab-12)','var(--color-cab-13)','var(--color-cab-14)'
];

// ── Module state ─────────────────────────────────────────────────────────────
const _st = { allItems: [], doneIds: new Set(), lastMatRef: null, selected: new Set(), lastClickIdx: -1, doneDropdownOpen: false, doneSearchQuery: '' };

// ── Cut-done localStorage helpers ─────────────────────────────────────────────
// Key is per-material so switching materials doesn't clobber each other.
const CUT_STORAGE_PREFIX = 'avl_cut_done__';
function cutKey(matRef) { return CUT_STORAGE_PREFIX + (matRef || '__all'); }
function lsCutLoad(matRef) {
    try { return new Set(JSON.parse(localStorage.getItem(cutKey(matRef)) || '[]')); }
    catch (e) { return new Set(); }
}
function lsCutSave(matRef, set) {
    try { localStorage.setItem(cutKey(matRef), JSON.stringify([...set])); } catch (e) { }
}
function lsCutClear(matRef) {
    try { localStorage.removeItem(cutKey(matRef)); } catch (e) { }
}

// ── Guillotine Packer ────────────────────────────────────────────────────────
class GuillotinePacker {
    constructor(W, H, kerf) { this.W=W; this.H=H; this.kerf=kerf; this.boards=[]; this._nb(); }
    _nb() { this.boards.push({ placements:[], freeRects:[{x:0,y:0,w:this.W,h:this.H}] }); }
    _best(fr, pw, ph, locked) {
        let b=null, bs=Infinity;
        const try_ = (w,h,rot) => { for(const r of fr) { if(w<=r.w&&h<=r.h){ const s=Math.min(r.w-w,r.h-h); if(s<bs){bs=s;b={rect:r,rotated:rot};} } } };
        try_(pw,ph,false); if(!locked) try_(ph,pw,true); return b;
    }
    _place(bi, part, {rect:r, rotated}) {
        const pw=rotated?part.h:part.w, ph=rotated?part.w:part.h, k=this.kerf;
        this.boards[bi].placements.push({x:r.x,y:r.y,w:pw,h:ph,rotated,part});
        const rW=r.w-pw-k, tH=r.h-ph-k, nr=[];
        if(rW>=tH){ if(rW>0&&ph>0) nr.push({x:r.x+pw+k,y:r.y,w:rW,h:ph}); if(tH>0&&r.w>0) nr.push({x:r.x,y:r.y+ph+k,w:r.w,h:tH}); }
        else      { if(tH>0&&r.w>0) nr.push({x:r.x,y:r.y+ph+k,w:r.w,h:tH}); if(rW>0&&ph>0) nr.push({x:r.x+pw+k,y:r.y,w:rW,h:ph}); }
        const i=this.boards[bi].freeRects.indexOf(r); this.boards[bi].freeRects.splice(i,1,...nr);
    }
    pack(part) {
        for(let bi=0;bi<this.boards.length;bi++){const f=this._best(this.boards[bi].freeRects,part.w,part.h,part.grainLocked);if(f){this._place(bi,part,f);return true;}}
        this._nb(); const bi=this.boards.length-1; const f=this._best(this.boards[bi].freeRects,part.w,part.h,part.grainLocked);
        if(f){this._place(bi,part,f);return true;} return false;
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const _FALLBACK_I18N = {
    de: {
        'cut.stat.done': 'Zugeschnitten',
        'cut.list.done_section': 'Bereits zugeschnitten ({done})',
        'cut.list.restorebtn': 'Zurückholen',
        'cut.list.restore_all': 'Alle zurückholen',
        'cut.list.pending_reopt': 'Für Nachfertigung (Neu optimieren)',
        'cut.list.done_search': 'Search',
        'cut.list.done_no_match': 'Keine passenden Teile gefunden'
    },
    en: {
        'cut.stat.done': 'Already Cut',
        'cut.list.done_section': 'Already cut ({done})',
        'cut.list.restorebtn': 'Restore',
        'cut.list.restore_all': 'Restore all',
        'cut.list.pending_reopt': 'Pending re-optimization',
        'cut.list.done_search': 'Search',
        'cut.list.done_no_match': 'No matching parts found'
    }
};
const t = (key, params) => {
    let res = window.AVL_LANG ? window.AVL_LANG.t(key, params) : key;
    if (res === key) {
        const lang = (window.AVL_LANG && window.AVL_LANG.getLang && window.AVL_LANG.getLang()) || 'de';
        const dict = _FALLBACK_I18N[lang] || _FALLBACK_I18N.de;
        if (dict[key]) {
            res = dict[key].replace(/\{(\w+)\}/g, (_, k) => (params && params[k] !== undefined) ? params[k] : `{${k}}`);
        }
    }
    return res;
};
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
window.addEventListener('languagechange', () => { if(window.renderAll) window.renderAll(); });

function getAllParts() {
    if(typeof reportData==='undefined'||!reportData.Project) return [];
    const proj = reportData.Project;
    const cabFilter = document.getElementById('cab-select')?.value || 'ALL';

    const getArray = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v;
        if (typeof v === 'object') return [v];
        return [];
    };
    const cabBySNR = {};
    const cabs = getArray(proj.CABINET);
    if (cabs.length > 0) {
        const sortedCabs = [...cabs];
        // Sort cabinets by SNR_CAB for consistent color indexing
        sortedCabs.sort((a, b) => {
            const valA = a.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (a.SNR_CAB || 'No CAB');
            const valB = b.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (b.SNR_CAB || 'No CAB');
            return String(valA).localeCompare(String(valB), undefined, { numeric: true });
        });
        sortedCabs.forEach((c, ci) => { if (c.SNR_CAB) cabBySNR[c.SNR_CAB] = { ci, c }; });
    }

    const rawParts = getArray(proj.INTERNALPRODUCTION);
    const allRawParts = [...rawParts];

    // Exclude small parts
    const smallPartSet = new Set();
    getArray(proj.SMALLPART).forEach(sp => {
        if (sp.FILENAME) smallPartSet.add(sp.FILENAME);
    });

    // Add BigParts to the pool
    getArray(proj.BIGPART).forEach(bp => {
        let snr = '';
        getArray(proj.BIGPART_ASSEMBLY).forEach(bpa => {
            if (bpa.BPINDEX === bp.BPINDEX && bpa.SNR_CAB) {
                snr = bpa.SNR_CAB;
            }
        });

        allRawParts.push({
            FILENAME: bp.FILENAME,
            DESCRIPTION: bp.DESCRIPTION,
            QTY: bp.QUANTITY,
            COMMENT: bp.COMMENT,
            SNR_CAB: snr,
            PAN_MATREF: bp.BP_MATREF,
            PAN_STL: bp.BP_L,
            PAN_STW: bp.BP_W,
            PAN_TWL: bp.BP_T,
            PAN_MATWITHGRAIN: bp.BP_MATWITHGRAIN || '0',
            isBigPart: true
        });
    });

    const parts = [];
    allRawParts.forEach(p => {
        // Skip small parts
        if (!p.isBigPart && smallPartSet.has(p.FILENAME)) return;

        const snr = p.SNR_CAB || '';
        const info = snr ? cabBySNR[snr] : null;
        const ci   = info ? info.ci : -1;
        const cab  = info ? info.c  : null;
        // Filter by cabinet selector (index-based, -1 = NoCab shown when ALL)
        if (cabFilter !== 'ALL' && String(ci) !== cabFilter) return;
        p._cabIdx  = ci;
        p._cabNr   = cab ? (cab.SNR_CAB || `${ci+1}`) : 'No CAB';
        p._cabDesc = cab ? (cab.DESCRIPTION_CAB || cab.SNR_CAB || `Cab ${ci+1}`) : 'No Cabinet';
        p._cabName = p._cabNr;
        if (!cab) p.SNR_CAB = "No CAB";
        parts.push(p);
    });
    return parts;
}

function getBoardParams() {
    const isImperialDisplay = window.AVL_UNITS && window.AVL_UNITS.getFormat() !== 'metric';
    const scale = isImperialDisplay ? 25.4 : 1;

    const rawL = parseFloat(document.getElementById('board-l')?.value) || (isImperialDisplay ? 110.2 : 2800);
    const rawW = parseFloat(document.getElementById('board-w')?.value) || (isImperialDisplay ? 40.7 : 1035);
    const rawKerf = parseFloat(document.getElementById('kerf')?.value) || (isImperialDisplay ? 0.16 : 4);

    const rawPadL = parseFloat(document.getElementById('pad-left')?.value) || 0;
    const rawPadR = parseFloat(document.getElementById('pad-right')?.value) || 0;
    const rawPadT = parseFloat(document.getElementById('pad-top')?.value) || 0;
    const rawPadB = parseFloat(document.getElementById('pad-bottom')?.value) || 0;

    return {
        W: rawL * scale,
        H: rawW * scale,
        kerf: rawKerf * scale,
        padL: rawPadL * scale,
        padR: rawPadR * scale,
        padT: rawPadT * scale,
        padB: rawPadB * scale,
        grain: document.querySelector('.grain-btn.active')?.dataset.dir || 'H'
    };
}

// ── Cabinet colour map: one colour per cabinet, exposed as CSS variables ─────
function buildCabinetColors() {
    if(typeof reportData==='undefined'||!reportData.Project) return {};
    const rawCabs = Array.isArray(reportData.Project.CABINET)?reportData.Project.CABINET:[reportData.Project.CABINET];
    const cabs = [...rawCabs];
    // Sort cabinets by SNR_CAB for consistent color indexing
    cabs.sort((a, b) => {
        const valA = a.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (a.SNR_CAB || 'No CAB');
        const valB = b.SNR_CAB === 'No CAB' ? 'ZZZZZ' : (b.SNR_CAB || 'No CAB');
        return String(valA).localeCompare(String(valB), undefined, { numeric: true });
    });
    const map={};
    const root=document.documentElement;
    cabs.forEach((c, ci)=>{
        const color=COLORS[ci%COLORS.length];
        map[ci]=color;
        // Expose as global CSS variable: var(--cab-color-0), var(--cab-color-1), …
        root.style.setProperty(`--cab-color-${ci}`, color);
    });
    _st.cabColorMap=map;
    return map;
}

// ── Build expanded items list ─────────────────────────────────────────────────
function buildExpandedItems(matRef, grain) {
    const raw = getAllParts().filter(p=>p.PAN_MATREF===matRef);
    // Colours by cabinet — use pre-built map or rebuild if missing
    const cabColors = _st.cabColorMap || buildCabinetColors();
    const items=[];
    const isImperialSource = window.AVL_UNITS && window.AVL_UNITS.getSourceFormat() !== 'metric';
    const srcScale = isImperialSource ? 25.4 : 1;

    raw.forEach(p=>{
        const qty=Math.max(1,parseInt(p.QTY,10)||1);
        const stl=(parseFloat(p.PAN_STL)||parseFloat(p.PAN_LWEB)||0) * srcScale;
        const stw=(parseFloat(p.PAN_STW)||parseFloat(p.PAN_WWEB)||0) * srcScale;
        if(!stl||!stw) return;
        const withGrain=p.PAN_MATWITHGRAIN==='1';
        const pw=withGrain?(grain==='H'?stl:stw):stl;
        const ph=withGrain?(grain==='H'?stw:stl):stw;
        for(let i=0;i<qty;i++) items.push({
            id:`${p.FILENAME||p.DESCRIPTION}_${i}`,
            w:pw, h:ph, stl, stw,
            grainLocked:withGrain,
            color: p._cabIdx < 0 ? 'var(--color-cab-nocab)' : (cabColors[p._cabIdx] ?? COLORS[0]),
            cabIdx: p._cabIdx,
            cabNr:  p._cabNr  || '',
            cabDesc:p._cabDesc || '',
            cabName:p._cabNr  || p._cabName || '',
            desc:p.DESCRIPTION||'',
            filename:p.FILENAME||''
        });
    });
    return items;
}

// ── SVG builder ───────────────────────────────────────────────────────────────
function buildBoardSVG(board, W, H, padL, padR, padT, padB, idx, grain) {
    const pid = `h${idx}`; const arrow = grain === 'H' ? '\u2192' : '\u2193';
    let area = 0; board.placements.forEach(p => area += p.w * p.h);

    const usableW = Math.max(10, W - padL - padR);
    const usableH = Math.max(10, H - padT - padB);

    const eff = ((area / (W * H)) * 100).toFixed(1);
    const trueM2 = (W * H - area) / 1e6;
    const wasteM2 = trueM2;

    const fmtDim = (v) => window.AVL_UNITS ? window.AVL_UNITS.formatDim(v) : Math.round(v);

    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="board-svg">`;
    s += `<defs><pattern id="${pid}" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="24" stroke="#888" stroke-width="1" opacity="0.18"/></pattern></defs>`;
    s += `<rect width="${W}" height="${H}" class="svg-board-bg"/>`;
    s += `<rect width="${W}" height="${H}" fill="url(#${pid})"/>`;

    // Visual indication of usable padded board area
    if (padL > 0 || padR > 0 || padT > 0 || padB > 0) {
        s += `<rect x="${padL}" y="${padT}" width="${usableW}" height="${usableH}" fill="none" stroke="var(--color-active-primary)" stroke-width="2" stroke-dasharray="6,4" opacity="0.6"/>`;
    }

    board.placements.forEach((pl, i) => {
        const absX = padL + pl.x;
        const absY = padT + pl.y;
        const c = pl.part.color, cx = absX + pl.w / 2, cy = absY + pl.h / 2;
        const tiny = pl.w < 70 || pl.h < 50;
        const isImperialSource = window.AVL_UNITS && window.AVL_UNITS.getSourceFormat() !== 'metric';
        const toSrc = (val) => isImperialSource ? val / 25.4 : val;
        const dim = `${fmtDim(toSrc(pl.w))}\u00d7${fmtDim(toSrc(pl.h))}`;
        const partIdEsc = esc(pl.part.id);
        s += `<rect x="${absX + 1.5}" y="${absY + 1.5}" width="${pl.w - 3}" height="${pl.h - 3}" fill="${c}" fill-opacity="0.72" stroke="${c}" stroke-width="2" rx="3" class="part-rect" data-part-id="${partIdEsc}" style="cursor:pointer;"/>`;
        if (!tiny) {
            const f1 = Math.max(10, Math.min(18, pl.h * 0.14)), f2 = Math.max(9, Math.min(14, pl.h * 0.11));
            s += `<text x="${cx}" y="${absY + pl.h * 0.28}" text-anchor="middle" font-size="${f1}" class="svg-label-main" pointer-events="none">${esc(String(pl.part.desc).substring(0, 20))}</text>`;
            s += `<text x="${cx}" y="${absY + pl.h * 0.50}" text-anchor="middle" font-size="${f2}" class="svg-label-file" pointer-events="none">${esc(String(pl.part.filename).substring(0, 18))}</text>`;
            s += `<text x="${cx}" y="${absY + pl.h * 0.72}" text-anchor="middle" font-size="${f2}" class="svg-label-dim" pointer-events="none">${dim}</text>`;
            if (pl.rotated) s += `<text x="${absX + pl.w - 8}" y="${absY + 20}" text-anchor="end" font-size="16" class="svg-label-rot" pointer-events="none">\u21ba</text>`;
        } else {
            s += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="${Math.max(9, pl.h * 0.18)}" class="svg-label-dim" pointer-events="none">${dim}</text>`;
        }
    });

    // Compute main cut lines relative to usable area
    function findMainCuts(placements, usableBoardH) {
        const candidates = new Set();
        placements.forEach(pl => { candidates.add(Math.round(pl.y)); candidates.add(Math.round(pl.y + pl.h)); });
        return [...candidates].sort((a, b) => a - b).filter(y => {
            if (y <= 0 || y >= usableBoardH) return false;
            return placements.every(pl => (pl.y + pl.h) <= y + 0.5 || pl.y >= y - 0.5);
        });
    }
    const mainCuts = findMainCuts(board.placements, usableH);

    s += `<text x="${padL + 18}" y="${padT + 32}" font-size="22" class="svg-grain-arrow" opacity="0.55">${arrow}</text>`;

    mainCuts.forEach(y => {
        const absY = padT + y;
        s += `<line x1="${padL}" y1="${absY}" x2="${padL + usableW}" y2="${absY}" stroke="#1e293b" stroke-width="9" stroke-dasharray="22,9" opacity="0.35" pointer-events="none"/>`;
        s += `<line x1="${padL}" y1="${absY}" x2="${padL + usableW}" y2="${absY}" stroke="#FF3CAC" stroke-width="3" stroke-dasharray="22,9" opacity="0.95" pointer-events="none"/>`;
        s += `<text x="${padL + 8}" y="${absY - 5}" font-size="12" fill="#FF3CAC" opacity="0.95" font-weight="bold" pointer-events="none">✂</text>`;
    });

    s += `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="var(--color-active-primary)" stroke-width="4"/>`;
    s += `</svg>`;
    return { svgHtml: s, eff: parseFloat(eff), wasteM2 };
}

// ── Cut list ──────────────────────────────────────────────────────────────────
function buildCutList(partBoardMap) {
    const panel=document.getElementById('cut-list-panel');
    if(!panel) return;
    const prevScroll = document.getElementById('cl-body')?.scrollTop || 0;
    panel.style.display='flex';

    partBoardMap = partBoardMap || _st.lastBoardMap || {};

    const total=_st.allItems.length;
    const done=_st.doneIds.size;
    const rem=total-done;
    const pct=total>0?Math.round(done/total*100):0;

    // ── Sort items by board → Y strip → X ──────────────────────────────────
    // Compute strip boundaries per board from the guillotine main cuts
    function getBoardStrips(boardIdx) {
        // Collect placements for this board
        const brdPlacements = [];
        _st.allItems.forEach(item => {
            const m = partBoardMap[item.id];
            if (m && m.board === boardIdx) brdPlacements.push(m);
        });
        const candidates = new Set();
        brdPlacements.forEach(p => { candidates.add(Math.round(p.y)); candidates.add(Math.round(p.y + p.h)); });
        const cuts = [0, ...[...candidates].sort((a,b)=>a-b).filter(y => {
            if (y <= 0) return false;
            return brdPlacements.every(p => (p.y + p.h) <= y + 0.5 || p.y >= y - 0.5);
        }), Infinity];
        return cuts; // array of Y boundaries: strip k = [cuts[k], cuts[k+1])
    }

    function getStripIndex(item) {
        const m = partBoardMap[item.id];
        if (!m) return 999;
        const cuts = getBoardStrips(m.board);
        for (let k = 0; k < cuts.length - 1; k++) {
            if (m.y >= cuts[k] - 0.5 && m.y < cuts[k+1] - 0.5) return k;
        }
        return 0;
    }

    const visibleItems = _st.allItems
        .filter(i => !_st.doneIds.has(i.id))
        .sort((a, b) => {
            const ma = partBoardMap[a.id] || { board: 999, x: 0, y: 0 };
            const mb = partBoardMap[b.id] || { board: 999, x: 0, y: 0 };
            if (ma.board !== mb.board) return ma.board - mb.board;
            const sa = getStripIndex(a), sb = getStripIndex(b);
            if (sa !== sb) return sa - sb;
            return ma.x - mb.x;
        });

    const doneItems = _st.allItems
        .filter(i => _st.doneIds.has(i.id))
        .sort((a, b) => {
            const ma = partBoardMap[a.id] || { board: 999, x: 0, y: 0 };
            const mb = partBoardMap[b.id] || { board: 999, x: 0, y: 0 };
            if (ma.board !== mb.board) return ma.board - mb.board;
            const sa = getStripIndex(a), sb = getStripIndex(b);
            if (sa !== sb) return sa - sb;
            if (ma.x !== mb.x) return ma.x - mb.x;
            return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
        });

    // Build sequential strip labels: only count bands that actually have panels.
    // Raw strip index 0,2 → displayed as Cut 1, Cut 2 (skip empty bands).
    const boardStripLabels = new Map(); // board -> Map(rawStripIdx -> sequentialLabel)
    visibleItems.forEach(item => {
        const m = partBoardMap[item.id] || {};
        const brd = m.board || 999;
        if (!boardStripLabels.has(brd)) boardStripLabels.set(brd, new Set());
        boardStripLabels.get(brd).add(getStripIndex(item));
    });
    boardStripLabels.forEach((rawSet, brd) => {
        const sorted = [...rawSet].sort((a, b) => a - b);
        const labelMap = new Map();
        sorted.forEach((rawIdx, i) => labelMap.set(rawIdx, i + 1));
        boardStripLabels.set(brd, labelMap);
    });
    function getStripLabel(item) {
        const m = partBoardMap[item.id] || {};
        const brd = m.board || 999;
        return boardStripLabels.get(brd)?.get(getStripIndex(item)) ?? 1;
    }

    // Build grouped rows: board header → strip header → panels
    let lastBoard = null, lastStrip = null;
    const fmtDim = (v) => window.AVL_UNITS ? window.AVL_UNITS.formatDim(v) : Math.round(v);
    const rows = visibleItems.map(item => {
        const m = partBoardMap[item.id] || {};
        const isPending = !m.board;
        const brd = m.board || '–';
        const strip = getStripIndex(item);
        const stripLabel = getStripLabel(item);
        // Detect rotation: placed w ≈ stw and placed h ≈ stl means the packer rotated it
        const wasRotated = m.w !== undefined && !item.grainLocked &&
            Math.abs(Math.round(m.w) - Math.round(item.stw)) < 2 &&
            Math.abs(Math.round(m.h) - Math.round(item.stl)) < 2;
        let out = '';
        if (isPending) {
            if (lastBoard !== '__PENDING__') {
                out += `<tr class="cl-pending-header"><td colspan="5"><span class="material-symbols-rounded">schedule</span> ${t('cut.list.pending_reopt')}</td></tr>`;
                lastBoard = '__PENDING__'; lastStrip = null;
            }
        } else {
            if (brd !== lastBoard) {
                out += `<tr class="cl-board-header"><td colspan="5"><span class="material-symbols-rounded">dashboard</span> ${t('cut.list.board')} ${brd}</td></tr>`;
                lastBoard = brd; lastStrip = null;
            }
            if (strip !== lastStrip) {
                out += `<tr class="cl-strip-header"><td colspan="5"><span class="material-symbols-rounded">horizontal_rule</span> ${t('cut.list.cut')} ${stripLabel}</td></tr>`;
                lastStrip = strip;
            }
        }
        out += `<tr id="cutrow-${esc(item.id)}" class="cut-row" data-part-id="${esc(item.id)}">
            <td class="cc-chk"><input type="checkbox" class="cut-cb" data-id="${esc(item.id)}"></td>
            <td class="cc-col"><span class="cut-swatch" style="background:${item.color}"></span></td>
            <td class="cc-desc"><span class="cut-dname">${esc(item.desc)}</span><span class="cut-fname">${esc(item.filename)}</span></td>
            <td class="cc-dim">${fmtDim(item.stl)}&times;${fmtDim(item.stw)}${wasRotated ? ' <span class="cc-rot">&#x21ba;</span>' : ''}</td>
            <td class="cc-brd">${brd}</td>
        </tr>`;
        return out;
    }).join('');

    const emptyOpenRow = !rows ? `<tr><td colspan="5" class="cl-empty-row">${t('cut.list.alldone')}</td></tr>` : '';

    panel.innerHTML = `
        <div class="cl-header">
            <span class="cl-title">${t('cut.list.title')}</span>
            <span class="cl-prog-text" id="cl-prog-text">${t('cut.list.done',{done,total})}</span>
        </div>
        <div class="cl-progress-track"><div class="cl-progress-bar" id="cl-prog-bar" style="width:${pct}%"></div></div>
        <div class="cl-body" id="cl-body">
            <table class="cl-table">
                <thead><tr><th></th><th></th><th>${t('cut.list.col.desc')}</th><th>${t('cut.list.col.mm')}</th><th>${t('cut.list.col.brd')}</th></tr></thead>
                <tbody id="cl-tbody">${rows || emptyOpenRow}</tbody>
            </table>
        </div>
        <div class="cl-footer">
            <div id="cl-sel-bar" class="cl-sel-bar" style="display:none">
                <span id="cl-sel-text"></span>
                <button id="cl-mark-done" class="cl-mark-done-btn"><span class="material-symbols-rounded">check</span> ${t('cut.list.markcutbtn')}</button>
            </div>
            <button id="reopt-btn" class="reopt-btn" ${rem === 0 ? 'disabled' : ''}>
                <span class="material-symbols-rounded">refresh</span> ${t('cut.list.reopt',{rem})}
            </button>
        </div>`;

    const clBody = document.getElementById('cl-body');
    if (clBody && prevScroll > 0) clBody.scrollTop = prevScroll;

    renderDoneDropdown();

    // ── Row selection: click / Ctrl+click / Shift+click ────────────────────────
    // Only count visible rows for range indexing
    const visibleRows = () => Array.from(panel.querySelectorAll('.cut-row')).filter(r => r.style.display !== 'none');
    _st.selected.clear();

    panel.querySelectorAll('.cut-row').forEach(row => {
        row.addEventListener('click', e => {
            if (e.target.type === 'checkbox') return;
            e.preventDefault(); // prevents browser text selection on Shift+click
            window.getSelection()?.removeAllRanges();

            const rows = visibleRows();
            const idx = rows.indexOf(row);
            const id = row.dataset.partId;

            if (e.shiftKey && _st.lastClickIdx >= 0) {
                // Range select from anchor to current
                const lo = Math.min(_st.lastClickIdx, idx);
                const hi = Math.max(_st.lastClickIdx, idx);
                _st.selected.clear();
                for (let i = lo; i <= hi; i++) {
                    if (rows[i]) _st.selected.add(rows[i].dataset.partId);
                }
                // Do NOT update lastClickIdx for shift (anchor stays fixed)
            } else if (e.ctrlKey || e.metaKey) {
                if (_st.selected.has(id)) _st.selected.delete(id);
                else _st.selected.add(id);
                _st.lastClickIdx = idx;
            } else {
                if (_st.selected.has(id)) {
                    _st.selected.delete(id);
                } else {
                    _st.selected.clear();
                    _st.selected.add(id);
                    if (!row.dataset.done) highlightSVGPart(id);
                }
                _st.lastClickIdx = idx;
            }
            updateSelectionUI(panel);
        });
    });

    // ── Checkbox: supports both marking as cut (checked) and restoring (unchecked) ──
    panel.querySelectorAll('.cut-cb').forEach(cb => {
        cb.addEventListener('change', e => {
            const id = e.target.dataset.id;
            const isChecking = e.target.checked;
            if (isChecking) {
                const targets = (_st.selected.has(id) && _st.selected.size > 1)
                    ? [..._st.selected].filter(tid => !_st.doneIds.has(tid))
                    : [id];
                targets.forEach(tid => {
                    _st.doneIds.add(tid);
                    _st.selected.delete(tid);
                    const row = document.getElementById(`cutrow-${tid}`);
                    if (row) row.style.opacity = '0';
                });
                lsCutSave(_st.lastMatRef, _st.doneIds);
                setTimeout(() => {
                    buildCutList(_st.lastBoardMap);
                    refreshCLHeader();
                }, 260);
            } else {
                // Restore part(s) back to open list for remanufacturing
                const targets = (_st.selected.has(id) && _st.selected.size > 1)
                    ? [..._st.selected].filter(tid => _st.doneIds.has(tid))
                    : [id];
                targets.forEach(tid => {
                    _st.doneIds.delete(tid);
                    _st.selected.delete(tid);
                });
                lsCutSave(_st.lastMatRef, _st.doneIds);
                buildCutList(_st.lastBoardMap);
                refreshCLHeader();
            }
        });
    });

    // "Mark cut" / "Restore" action button for multi-selection
    panel.querySelector('#cl-mark-done')?.addEventListener('click', () => {
        const selectedArr = [..._st.selected];
        const allSelectedDone = selectedArr.length > 0 && selectedArr.every(tid => _st.doneIds.has(tid));
        if (allSelectedDone) {
            selectedArr.forEach(tid => {
                _st.doneIds.delete(tid);
                _st.selected.delete(tid);
            });
            lsCutSave(_st.lastMatRef, _st.doneIds);
            buildCutList(_st.lastBoardMap);
            refreshCLHeader();
        } else {
            const targets = selectedArr.filter(tid => !_st.doneIds.has(tid));
            targets.forEach(tid => {
                _st.doneIds.add(tid);
                _st.selected.delete(tid);
                const row = document.getElementById(`cutrow-${tid}`);
                if (row) row.style.opacity = '0';
            });
            lsCutSave(_st.lastMatRef, _st.doneIds);
            setTimeout(() => {
                buildCutList(_st.lastBoardMap);
                refreshCLHeader();
            }, 260);
        }
    });

    document.getElementById('reopt-btn')?.addEventListener('click', runOptimization);
}

function updateSelectionUI(panel) {
    const n = _st.selected.size;
    panel.querySelectorAll('.cut-row').forEach(r => r.classList.toggle('selected', _st.selected.has(r.dataset.partId)));
    const bar = document.getElementById('cl-sel-bar');
    const txt = document.getElementById('cl-sel-text');
    const btn = document.getElementById('cl-mark-done');
    if (bar) bar.style.display = n > 1 ? '' : 'none';
    if (txt) txt.textContent = t('cut.list.selected', {n});
    if (btn && n > 1) {
        const allSelectedDone = [..._st.selected].every(tid => _st.doneIds.has(tid));
        btn.innerHTML = allSelectedDone
            ? `<span class="material-symbols-rounded">undo</span> ${t('cut.list.restorebtn')}`
            : `<span class="material-symbols-rounded">check</span> ${t('cut.list.markcutbtn')}`;
    }
}

function renderDoneDropdown() {
    const wrap = document.getElementById('done-stat-wrap');
    if (!wrap) return;
    const prevDdScroll = document.getElementById('done-dd-body')?.scrollTop || 0;
    const wasSearchFocused = document.activeElement?.id === 'done-dd-search';
    const partBoardMap = _st.lastBoardMap || {};
    const fmtDim = (v) => window.AVL_UNITS ? window.AVL_UNITS.formatDim(v) : Math.round(v);

    const doneItems = _st.allItems
        .filter(i => _st.doneIds.has(i.id))
        .sort((a, b) => {
            const ma = partBoardMap[a.id] || { board: 999, x: 0, y: 0 };
            const mb = partBoardMap[b.id] || { board: 999, x: 0, y: 0 };
            if (ma.board !== mb.board) return ma.board - mb.board;
            if (ma.y !== mb.y) return ma.y - mb.y;
            if (ma.x !== mb.x) return ma.x - mb.x;
            return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
        });

    const done = doneItems.length;
    if (done === 0) {
        _st.doneDropdownOpen = false;
        _st.doneSearchQuery = '';
    }
    const isOpen = _st.doneDropdownOpen && done > 0;
    const q = (_st.doneSearchQuery || '').trim().toLowerCase();

    const doneRowsHtml = doneItems.map(item => {
        const m = partBoardMap[item.id] || {};
        const brd = m.board || '–';
        const dimStr = `${fmtDim(item.stl)}x${fmtDim(item.stw)}`;
        const searchBlob = `${item.desc || ''} ${item.filename || ''} ${item.cabNr || ''} ${item.cabDesc || ''} ${dimStr} ${brd}`.toLowerCase();
        const matches = !q || searchBlob.includes(q);
        return `<tr class="cut-row done-row" data-part-id="${esc(item.id)}" data-search="${esc(searchBlob)}" style="${matches ? '' : 'display:none;'}">
            <td class="cc-chk"><input type="checkbox" class="cut-cb done-dd-cb" data-id="${esc(item.id)}" checked></td>
            <td class="cc-col"><span class="cut-swatch" style="background:${item.color}"></span></td>
            <td class="cc-desc"><span class="cut-dname">${esc(item.desc)}</span><span class="cut-fname">${esc(item.filename)}</span></td>
            <td class="cc-dim">${fmtDim(item.stl)}&times;${fmtDim(item.stw)}</td>
            <td class="cc-brd">${brd}</td>
        </tr>`;
    }).join('');

    const anyMatch = !q || doneItems.some(item => {
        const m = partBoardMap[item.id] || {};
        const brd = m.board || '–';
        const dimStr = `${fmtDim(item.stl)}x${fmtDim(item.stw)}`;
        return `${item.desc || ''} ${item.filename || ''} ${item.cabNr || ''} ${item.cabDesc || ''} ${dimStr} ${brd}`.toLowerCase().includes(q);
    });

    wrap.innerHTML = `
        <div class="stat-chip done-chip${done === 0 ? ' disabled' : ''}${isOpen ? ' open' : ''}" id="done-stat-chip">
            <span class="stat-val done-chip-val">
                <span>${done}</span>
                ${done > 0 ? '<span class="material-symbols-rounded">expand_more</span>' : ''}
            </span>
            <span class="stat-lbl">${t('cut.stat.done')}</span>
        </div>
        <div class="done-dropdown-menu${isOpen ? ' open' : ''}" id="done-dropdown-menu">
            <div class="done-dd-header">
                <span class="done-dd-title">${t('cut.list.done_section', { done })}</span>
                <button type="button" id="cl-restore-all" class="cl-restore-all-btn" title="${t('cut.list.restore_all')}">
                    <span class="material-symbols-rounded">restart_alt</span>
                    <span>${t('cut.list.restore_all')}</span>
                </button>
            </div>
            <div class="done-dd-search-wrap">
                <span class="material-symbols-rounded">search</span>
                <input type="text" id="done-dd-search" class="done-dd-search-input" placeholder="${esc(t('cut.list.done_search'))}" value="${esc(_st.doneSearchQuery || '')}" autocomplete="off" />
                <button type="button" id="done-dd-search-clear" class="done-dd-search-clear" style="display:${q ? ' inline-flex' : 'none'}">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            <div class="done-dd-body" id="done-dd-body">
                <table class="cl-table">
                    <thead><tr><th></th><th></th><th>${t('cut.list.col.desc')}</th><th>${t('cut.list.col.mm')}</th><th>${t('cut.list.col.brd')}</th></tr></thead>
                    <tbody id="done-dd-tbody">
                        ${doneRowsHtml}
                        <tr id="done-dd-no-match" style="${anyMatch ? 'display:none;' : ''}"><td colspan="5" class="cl-empty-row">${t('cut.list.done_no_match')}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>`;

    const ddBody = document.getElementById('done-dd-body');
    if (ddBody && prevDdScroll > 0) ddBody.scrollTop = prevDdScroll;

    const searchInput = wrap.querySelector('#done-dd-search');
    const clearBtn = wrap.querySelector('#done-dd-search-clear');
    const noMatchRow = wrap.querySelector('#done-dd-no-match');

    function applyDoneFilter(val) {
        _st.doneSearchQuery = val;
        const term = val.trim().toLowerCase();
        if (clearBtn) clearBtn.style.display = term ? 'inline-flex' : 'none';
        let visibleCount = 0;
        wrap.querySelectorAll('.cut-row.done-row').forEach(r => {
            const hay = r.dataset.search || '';
            const show = !term || hay.includes(term);
            r.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });
        if (noMatchRow) noMatchRow.style.display = visibleCount === 0 ? '' : 'none';
    }

    searchInput?.addEventListener('input', (e) => {
        applyDoneFilter(e.target.value);
    });

    clearBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (searchInput) {
            searchInput.value = '';
            applyDoneFilter('');
            searchInput.focus();
        }
    });

    if (wasSearchFocused && searchInput && isOpen) {
        searchInput.focus();
        const len = searchInput.value.length;
        searchInput.setSelectionRange(len, len);
    }

    wrap.querySelector('#done-stat-chip')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (done === 0) return;
        _st.doneDropdownOpen = !_st.doneDropdownOpen;
        wrap.querySelector('#done-stat-chip')?.classList.toggle('open', _st.doneDropdownOpen);
        wrap.querySelector('#done-dropdown-menu')?.classList.toggle('open', _st.doneDropdownOpen);
    });

    wrap.querySelector('#done-dropdown-menu')?.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    wrap.querySelector('#cl-restore-all')?.addEventListener('click', (e) => {
        e.stopPropagation();
        _st.doneIds.clear();
        _st.selected.clear();
        _st.doneDropdownOpen = false;
        lsCutSave(_st.lastMatRef, _st.doneIds);
        buildCutList(_st.lastBoardMap);
        refreshCLHeader();
    });

    wrap.querySelectorAll('.done-dd-cb').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (!e.target.checked && id) {
                _st.doneIds.delete(id);
                _st.selected.delete(id);
                lsCutSave(_st.lastMatRef, _st.doneIds);
                buildCutList(_st.lastBoardMap);
                refreshCLHeader();
            }
        });
    });

    wrap.querySelectorAll('.cut-row.done-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return;
            const id = row.dataset.partId;
            if (id) {
                _st.doneIds.delete(id);
                _st.selected.delete(id);
                lsCutSave(_st.lastMatRef, _st.doneIds);
                buildCutList(_st.lastBoardMap);
                refreshCLHeader();
            }
        });
    });
}

function refreshCLHeader() {
    const total=_st.allItems.length, done=_st.doneIds.size, rem=total-done;
    const pct=total>0?Math.round(done/total*100):0;
    const tEl=document.getElementById('cl-prog-text'); if(tEl) tEl.textContent=t('cut.list.done',{done,total});
    const b=document.getElementById('cl-prog-bar'); if(b) b.style.width=`${pct}%`;
    const r=document.getElementById('reopt-btn'); if(r){ r.disabled=rem===0; r.innerHTML=`<span class="material-symbols-rounded">refresh</span> ${t('cut.list.reopt',{rem})}`; }
    renderDoneDropdown();
}

// ── SVG click → highlight table row ──────────────────────────────────────────
function attachSVGClickHandler() {
    const area=document.getElementById('slide-svg-area');
    if(!area) return;
    area.addEventListener('click', e=>{
        const el=e.target.closest('[data-part-id]');
        if(!el) return;
        highlightCLRow(el.getAttribute('data-part-id'));
    });
}

function highlightCLRow(partId) {
    document.querySelectorAll('.cut-row.hl').forEach(r=>r.classList.remove('hl'));
    const row=document.getElementById(`cutrow-${partId}`);
    if(!row) return;
    row.classList.add('hl');
    row.scrollIntoView({behavior:'smooth', block:'nearest'});
}

function highlightSVGPart(partId) {
    // Flash the matching rect in all boards by briefly changing opacity
    document.querySelectorAll(`[data-part-id="${CSS.escape(partId)}"]`).forEach(r=>{
        const orig=r.getAttribute('fill-opacity')||'0.72';
        r.setAttribute('fill-opacity','1');
        setTimeout(()=>r.setAttribute('fill-opacity', orig), 600);
    });
}

// ── Main optimization flow ────────────────────────────────────────────────────
function optimize() {
    const matRef=document.getElementById('mat-select').value;
    const {grain}=getBoardParams();

    // Reset done state when material changes (and clear its localStorage key)
    if(matRef!==_st.lastMatRef){
        // Preserve cut progress per material in localStorage when switching materials
        _st.doneIds = lsCutLoad(matRef); // load saved state for the new material
        _st.lastMatRef=matRef;
    }
    _st.allItems=buildExpandedItems(matRef, grain);

    if(!_st.allItems.length){
        document.getElementById('cutting-output').innerHTML=
            `<div class="output-empty"><span class="material-symbols-rounded">search_off</span><p>${t('cut.noparts')}</p></div>`;
        return;
    }
    runOptimization();
}

function runOptimization() {
    const { W, H, kerf, padL, padR, padT, padB, grain } = getBoardParams();
    const active = _st.allItems.filter(i => !_st.doneIds.has(i.id));

    if (!active.length) {
        const wasteZero = window.AVL_UNITS ? window.AVL_UNITS.formatAreaFromM2(0) : '0.000 m²';
        document.getElementById('cutting-output').innerHTML = `
            <div class="cut-stats-bar">
                <div class="stat-chip"><span class="stat-val">0</span><span class="stat-lbl">${t('cut.stat.boards')}</span></div>
                <div class="stat-chip"><span class="stat-val">0</span><span class="stat-lbl">${t('cut.stat.placed')}</span></div>
                <div class="stat-chip eff-chip"><span class="stat-val">0.0%</span><span class="stat-lbl">${t('cut.stat.efficiency')}</span></div>
                <div class="stat-chip"><span class="stat-val">${wasteZero}</span><span class="stat-lbl">${t('cut.stat.waste')}</span></div>
                <div class="done-stat-wrap" id="done-stat-wrap"></div>
            </div>
            <div class="output-empty"><span class="material-symbols-rounded">check_circle</span><p>${t('cut.allcut')}</p></div>`;
        buildCutList(_st.lastBoardMap || {});
        refreshCLHeader();
        return;
    }

    const usableW = Math.max(10, W - padL - padR);
    const usableH = Math.max(10, H - padT - padB);

    active.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    const unplaceable = active.filter(i => {
        const fn = i.w <= usableW && i.h <= usableH;
        const fr = !i.grainLocked && i.h <= usableW && i.w <= usableH;
        return !fn && !fr;
    });
    const placeable = active.filter(i => !unplaceable.includes(i));

    const packer = new GuillotinePacker(usableW, usableH, kerf);
    placeable.forEach(i => packer.pack(i));

    // Build extended partId → {board, x, y, w, h} map with padding offset
    const boardMap = {};
    packer.boards.forEach((brd, bi) => brd.placements.forEach(pl => {
        boardMap[pl.part.id] = { board: bi + 1, x: padL + pl.x, y: padT + pl.y, w: pl.w, h: pl.h };
    }));

    // Persist for language/unit change re-render
    _st.lastResult = { boards: packer.boards, W, H, padL, padR, padT, padB, allItems: active, unplaceable, grain };
    _st.lastBoardMap = boardMap;

    renderOutput(packer.boards, W, H, padL, padR, padT, padB, active, unplaceable, grain);
    buildCutList(boardMap);
    buildCabLegend();
    attachSVGClickHandler();
}

// ── Cabinet legend in controls panel ────────────────────────────────────
function buildCabLegend() {
    const el = document.getElementById('cab-legend');
    if (!el) return;
    // Collect unique cabinets present in the current material's items
    const seen = new Map(); // cabIdx -> first item with that cabinet
    _st.allItems.forEach(item => {
        if (!seen.has(item.cabIdx)) seen.set(item.cabIdx, item);
    });
    if (!seen.size) { el.innerHTML = ''; return; }
    const rows = [...seen.values()].sort((a,b)=>a.cabIdx-b.cabIdx).map(item => `
        <div class="cab-leg-row">
            <span class="cab-leg-dot" style="background:${item.color}"></span>
            <span class="cab-leg-nr">${esc(item.cabNr)}</span>
            <span class="cab-leg-desc">${esc(item.cabDesc)}</span>
        </div>`).join('');
    el.innerHTML = `<div class="cab-leg-title">${t('cut.legend.title')}</div>${rows}`;
}

// ── Render slideshow ──────────────────────────────────────────────────────────
function renderOutput(boards, W, H, padL, padR, padT, padB, allItems, unplaceable, grain) {
    const output = document.getElementById('cutting-output');
    if (!output) return;
    output.innerHTML = '';

    let totalArea = 0;
    boards.forEach(b => b.placements.forEach(p => totalArea += p.w * p.h));
    const totalBoardArea = boards.length * W * H;
    const eff = ((totalArea / totalBoardArea) * 100).toFixed(1);
    const trueM2 = (totalBoardArea - totalArea) / 1e6;
    const wasteVal = trueM2;

    const fmtDim = (v) => window.AVL_UNITS ? window.AVL_UNITS.formatDim(v) : Math.round(v);
    const wasteFormatted = window.AVL_UNITS ? window.AVL_UNITS.formatAreaFromM2(wasteVal) : `${wasteVal.toFixed(3)} m²`;

    const stats = document.createElement('div'); stats.className = 'cut-stats-bar';
    stats.innerHTML = `
        <div class="stat-chip"><span class="stat-val">${boards.length}</span><span class="stat-lbl">${t('cut.stat.boards')}</span></div>
        <div class="stat-chip"><span class="stat-val">${allItems.length - unplaceable.length}</span><span class="stat-lbl">${t('cut.stat.placed')}</span></div>
        <div class="stat-chip eff-chip"><span class="stat-val">${eff}%</span><span class="stat-lbl">${t('cut.stat.efficiency')}</span></div>
        <div class="stat-chip"><span class="stat-val">${wasteFormatted}</span><span class="stat-lbl">${t('cut.stat.waste')}</span></div>
        <div class="done-stat-wrap" id="done-stat-wrap"></div>`;
    output.appendChild(stats);
    renderDoneDropdown();

    if (unplaceable.length) {
        const w = document.createElement('div'); w.className = 'cut-warning';
        const isImperialSource = window.AVL_UNITS && window.AVL_UNITS.getSourceFormat() !== 'metric';
        const toSrc = (val) => isImperialSource ? val / 25.4 : val;
        w.innerHTML = `<span class="material-symbols-rounded">warning</span><span><strong>${t('cut.warn.exceed', { n: unplaceable.length })}</strong> ${unplaceable.map(u => `<code>${esc(u.desc)} ${fmtDim(toSrc(u.w))}&times;${fmtDim(toSrc(u.h))}</code>`).join(' ')}</span>`;
        output.appendChild(w);
    }

    const slides = boards.map((b, i) => buildBoardSVG(b, W, H, padL, padR, padT, padB, i, grain));
    const multi=boards.length>1;
    let cur=0;

    const ss=document.createElement('div'); ss.className='board-slideshow';
    ss.innerHTML=`
        <div class="slide-header">
            <span class="slide-title">${t('cut.slide.board')} <span id="slide-num">1</span> <span class="slide-of">${t('cut.slide.of')} ${boards.length}</span></span>
            <div class="zoom-controls">
                <button class="zoom-btn" id="zoom-in" title="${t('cut.zoom.in')}"><span class="material-symbols-rounded">zoom_in</span></button>
                <button class="zoom-btn" id="zoom-out" title="${t('cut.zoom.out')}"><span class="material-symbols-rounded">zoom_out</span></button>
                <button class="zoom-btn" id="zoom-reset" title="${t('cut.zoom.reset')}" disabled><span class="material-symbols-rounded">fit_screen</span></button>
            </div>
        </div>
        <div class="slide-svg-area" id="slide-svg-area">${slides[0].svgHtml}</div>
        <div class="slide-nav" ${!multi?'style="display:none"':''}>
            <button class="slide-nav-btn" id="slide-prev">
                <span class="material-symbols-rounded">arrow_back</span> ${t('cut.slide.prev')}
            </button>
            <div class="slide-dots" id="slide-dots">
                ${boards.map((_,i)=>`<span class="slide-dot${i===0?' active':''}" data-idx="${i}" title="${t('cut.slide.board')} ${i+1}"></span>`).join('')}
            </div>
            <button class="slide-nav-btn" id="slide-next">
                ${t('cut.slide.next')} <span class="material-symbols-rounded">arrow_forward</span>
            </button>
        </div>`;
    output.appendChild(ss);
    attachZoomControls(W, H);

    if(!multi) return;

    function goTo(idx){
        if(idx<0||idx>=boards.length) return;
        cur=idx;
        document.getElementById('slide-num').textContent=idx+1;
        document.getElementById('slide-svg-area').innerHTML=slides[idx].svgHtml;
        document.querySelectorAll('.slide-dot').forEach((d,i)=>d.classList.toggle('active',i===idx));
        document.getElementById('slide-prev').disabled=idx===0;
        document.getElementById('slide-next').disabled=idx===boards.length-1;
        // Re-apply current zoom viewBox to new SVG
        const svg=document.querySelector('#slide-svg-area .board-svg');
        if(svg&&_st.zoom) svg.setAttribute('viewBox',_st.zoom);
    }
    document.getElementById('slide-prev').disabled=true;
    document.getElementById('slide-prev').addEventListener('click',()=>goTo(cur-1));
    document.getElementById('slide-next').addEventListener('click',()=>goTo(cur+1));
    document.querySelectorAll('.slide-dot').forEach(d=>d.addEventListener('click',()=>goTo(parseInt(d.dataset.idx))));
    document.addEventListener('keydown',e=>{ if(e.key==='ArrowLeft')goTo(cur-1); if(e.key==='ArrowRight')goTo(cur+1); });
}

function effClass(e){ return e>=80?'eff-good':e>=60?'eff-ok':'eff-low'; }

// ── Zoom / Pan ────────────────────────────────────────────────────────────────
function attachZoomControls(W, H) {
    const area = document.getElementById('slide-svg-area');
    if (!area) return;
    _st.zoom = null; // reset on new optimization

    let vx=0, vy=0, vw=W, vh=H;
    let dragging=false, dOrig=null;
    const clamp = (v,mn,mx) => Math.min(mx,Math.max(mn,v));

    function getSVG() { return area.querySelector('.board-svg'); }

    function applyVB() {
        vx=clamp(vx, -vw*0.1, W-vw+vw*0.1);
        vy=clamp(vy, -vh*0.1, H-vh+vh*0.1);
        const vb=`${vx} ${vy} ${vw} ${vh}`;
        getSVG()?.setAttribute('viewBox', vb);
        _st.zoom = vw<W*0.98 ? vb : null; // persist for board slides
        const zoomed=vw<W*0.98;
        area.style.cursor = zoomed ? 'grab' : '';
        const rb=document.getElementById('zoom-reset');
        if(rb) rb.disabled=!zoomed;
    }

    area.addEventListener('wheel', e => {
        e.preventDefault();
        const f = e.deltaY>0 ? 1.18 : 1/1.18;
        const nw=clamp(vw*f, W/12, W);
        const nh=nw/W*H;
        const rect=area.getBoundingClientRect();
        const mx=vx+(e.clientX-rect.left)/rect.width*vw;
        const my=vy+(e.clientY-rect.top)/rect.height*vh;
        vw=nw; vh=nh;
        vx=mx-((e.clientX-rect.left)/rect.width)*vw;
        vy=my-((e.clientY-rect.top)/rect.height)*vh;
        applyVB();
    }, {passive:false});

    area.addEventListener('mousedown', e => {
        if(vw>=W*0.98) return;
        if(e.button!==0) return;
        dragging=true; dOrig={x:e.clientX,y:e.clientY,vx,vy};
        area.style.cursor='grabbing'; e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
        if(!dragging) return;
        const rect=area.getBoundingClientRect();
        vx=dOrig.vx+(dOrig.x-e.clientX)/rect.width*vw;
        vy=dOrig.vy+(dOrig.y-e.clientY)/rect.height*vh;
        applyVB();
    });
    window.addEventListener('mouseup', () => {
        if(dragging){ dragging=false; area.style.cursor=vw<W*0.98?'grab':''; }
    });

    function zoomBy(factor) {
        const cx=vx+vw/2, cy=vy+vh/2;
        vw=clamp(vw*factor,W/12,W); vh=vw/W*H;
        vx=cx-vw/2; vy=cy-vh/2; applyVB();
    }
    document.getElementById('zoom-in')?.addEventListener('click', ()=>zoomBy(1/1.4));
    document.getElementById('zoom-out')?.addEventListener('click', ()=>zoomBy(1.4));
    document.getElementById('zoom-reset')?.addEventListener('click', ()=>{
        vx=0;vy=0;vw=W;vh=H; applyVB();
    });
}

// ── UI init ───────────────────────────────────────────────────────────────────
function populateCabinets() {
    const sel = document.getElementById('cab-select');
    if (!sel || typeof reportData === 'undefined' || !reportData.Project) return;
    const cabs = Array.isArray(reportData.Project.CABINET) ? reportData.Project.CABINET : [reportData.Project.CABINET];
    let html = `<option value="ALL" data-i18n="cut.ctrl.cab.all">ALL Cabinets</option>`;
    cabs.forEach((c, ci) => {
        const nr = c.SNR_CAB || `${ci+1}`;
        const desc = c.DESCRIPTION_CAB ? ` \u2014 ${c.DESCRIPTION_CAB}` : '';
        html += `<option value="${ci}">${esc(nr)}${esc(desc)}</option>`;
    });
    html += `<option value="-1">— No Cabinet</option>`;
    const currentVal = sel.value;
    sel.innerHTML = html;
    if (sel.querySelector(`option[value="${currentVal}"]`)) {
        sel.value = currentVal;
    }
}

function populateMaterials(){
    const sel=document.getElementById('mat-select'); if(!sel) return;
    buildCabinetColors(); // set --cab-color-N CSS variables immediately on load
    const map={}; getAllParts().forEach(p=>{ if(p.PAN_MATREF&&!map[p.PAN_MATREF]) map[p.PAN_MATREF]=p.PAN_MATDESC||p.PAN_MATREF; });
    const currentVal = sel.value;
    sel.innerHTML=Object.entries(map).map(([r,d])=>`<option value="${esc(r)}">${esc(r)} \u2014 ${esc(d)}</option>`).join('');
    if (map[currentVal]) sel.value = currentVal;
    updateGrainVis();
}
function updateGrainVis() {
    const v = document.getElementById('mat-select')?.value;
    const section = document.getElementById('grain-section');
    const info = document.getElementById('grain-info');
    if (!v || !section) return;
    const parts = getAllParts().filter(p => p.PAN_MATREF === v);
    const grainCount = parts.filter(p => p.PAN_MATWITHGRAIN === '1').length;
    const freeCount  = parts.filter(p => p.PAN_MATWITHGRAIN !== '1').length;
    section.style.display = grainCount > 0 ? '' : 'none';
    if (info && grainCount > 0) {
        const dir = document.querySelector('.grain-btn.active')?.dataset.dir || 'H';
        info.textContent = t('cut.grain.locked', { grain: grainCount, free: freeCount });
    }
}

function updateCuttingUnitLabels() {
    const isImperial = window.AVL_UNITS && window.AVL_UNITS.getFormat() !== 'metric';
    const unitStr = isImperial ? 'in' : 'mm';

    document.querySelectorAll('.unit-label-dim').forEach(el => el.textContent = unitStr);

    const presetSelect = document.getElementById('board-preset');
    if (presetSelect) {
        const p1 = presetSelect.querySelector('option[value="2800x1035"]');
        const p2 = presetSelect.querySelector('option[value="2800x2070"]');
        if (p1) p1.textContent = isImperial ? 'Half Board (110.2 × 40.7 in)' : 'Halbformat (2800 × 1035 mm)';
        if (p2) p2.textContent = isImperial ? 'Full Board (110.2 × 81.5 in)' : 'Vollformat (2800 × 2070 mm)';
    }

    const currentFmt = window.AVL_UNITS ? window.AVL_UNITS.getFormat() : 'metric';
    const isCurrImp = currentFmt !== 'metric';
    const isPrevImp = _st.lastUnitFormat ? (_st.lastUnitFormat !== 'metric') : false;

    if (isCurrImp !== isPrevImp) {
        const factor = isCurrImp ? (1 / 25.4) : 25.4;
        ['board-l', 'board-w', 'kerf', 'pad-left', 'pad-right', 'pad-top', 'pad-bottom'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value !== '') {
                const v = parseFloat(el.value);
                if (!isNaN(v) && v > 0) {
                    el.value = isCurrImp ? parseFloat((v * factor).toFixed(2)) : Math.round(v * factor);
                }
            }
        });
    }
    _st.lastUnitFormat = currentFmt;
}


function ensureCuttingDoneStyles() {
    if (document.getElementById('avl-cutting-done-styles')) return;
    const st = document.createElement('style');
    st.id = 'avl-cutting-done-styles';
    st.textContent = `
        .cl-pending-header td {
            padding: 6px 8px 4px;
            font-weight: 700;
            font-size: 0.74rem;
            color: #F59E0B;
            background: rgba(245, 158, 11, 0.1);
            border-top: 1px solid rgba(245, 158, 11, 0.3);
            border-bottom: 1px dashed rgba(245, 158, 11, 0.3);
        }
        .cl-pending-header td .material-symbols-rounded { font-size: 14px; vertical-align: middle; margin-right: 4px; }
        .done-stat-wrap { position: relative; display: flex; }
        .stat-chip.done-chip {
            cursor: pointer;
            user-select: none;
            transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
            min-width: 110px;
        }
        .stat-chip.done-chip:hover:not(.disabled) {
            border-color: var(--color-active-primary);
            background: var(--color-hover-secondary);
        }
        .stat-chip.done-chip.open {
            border-color: var(--color-active-primary);
            box-shadow: 0 0 0 2px rgba(0,153,217,0.15);
        }
        .stat-chip.done-chip.disabled { opacity: 0.55; cursor: default; }
        .done-chip-val { display: inline-flex; align-items: center; gap: 2px; }
        .done-chip-val .material-symbols-rounded {
            font-size: 18px;
            color: var(--color-active-primary);
            transition: transform 0.15s;
            margin-right: -4px;
        }
        .stat-chip.done-chip.open .done-chip-val .material-symbols-rounded { transform: rotate(180deg); }
        .done-dropdown-menu {
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            z-index: 500;
            width: 420px;
            max-height: 360px;
            display: none;
            flex-direction: column;
            background: var(--color-bg-sidebar);
            border: 1px solid var(--color-border-hr);
            box-shadow: 0 8px 24px rgba(0,0,0,0.22);
            border-radius: 2px;
            overflow: hidden;
        }
        .done-dropdown-menu.open { display: flex; }
        .done-dd-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 8px 12px;
            background: var(--color-bg-secondary);
            border-bottom: 1px solid var(--color-border-hr);
            flex-shrink: 0;
        }
        .done-dd-title {
            font-size: 0.76rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-text-secondary);
        }
        .done-dd-search-wrap {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            background: var(--color-bg-primary);
            border-bottom: 1px solid var(--color-bg-secondary);
            flex-shrink: 0;
        }
        .done-dd-search-wrap .material-symbols-rounded {
            font-size: 16px;
            color: var(--color-text-placeholder);
            flex-shrink: 0;
        }
        .done-dd-search-input {
            flex: 1;
            border: none;
            background: transparent;
            color: var(--color-text-primary);
            font-family: inherit;
            font-size: 0.8rem;
            outline: none;
            min-width: 0;
        }
        .done-dd-search-input::placeholder { color: var(--color-text-placeholder); }
        .done-dd-search-clear {
            display: none;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            padding: 2px;
            cursor: pointer;
            color: var(--color-text-placeholder);
            border-radius: 2px;
        }
        .done-dd-search-clear:hover {
            color: var(--color-text-primary);
            background: var(--color-hover-secondary);
        }
        .done-dd-search-clear .material-symbols-rounded { font-size: 14px; }
        .done-dd-body { flex: 1; overflow-y: auto; max-height: 290px; }
        .cl-restore-all-btn {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 2px 7px;
            font-size: 0.7rem;
            font-weight: 600;
            font-family: inherit;
            color: var(--color-active-primary);
            background: var(--color-bg-primary);
            border: 1px solid var(--color-active-primary);
            border-radius: 2px;
            cursor: pointer;
            transition: background 0.15s, color 0.15s;
        }
        .cl-restore-all-btn:hover { background: var(--color-active-primary); color: #fff; }
        .cl-restore-all-btn .material-symbols-rounded { font-size: 13px; }
        .cut-row.done-row { opacity: 0.62; background: rgba(16, 185, 129, 0.04); }
        .cut-row.done-row:hover { opacity: 0.95; background: var(--color-hover-secondary); }
        .cut-row.done-row .cut-dname { text-decoration: line-through; color: var(--color-text-secondary); }
        .cut-row.done-row.selected { opacity: 1; }
    `;
    document.head.appendChild(st);
}

document.addEventListener('DOMContentLoaded',()=>{
    ensureCuttingDoneStyles();
    // Restore cut-done state from embedded file snapshot (if tabledata.js was saved)
    if (window.AVL_SAVE) window.AVL_SAVE.restoreAll();

    populateCabinets();
    populateMaterials();
    updateCuttingUnitLabels();
    document.getElementById('cab-select')?.addEventListener('change', populateMaterials);
    document.getElementById('mat-select')?.addEventListener('change', updateGrainVis);
    const preset=document.getElementById('board-preset'), lI=document.getElementById('board-l'), wI=document.getElementById('board-w');
    preset?.addEventListener('change',()=>{ 
        if(preset.value==='custom')return; 
        const[l,w]=preset.value.split('x').map(Number); 
        const isImp = window.AVL_UNITS && window.AVL_UNITS.getFormat() !== 'metric';
        const f = isImp ? (1/25.4) : 1;
        lI.value=(l*f).toFixed(isImp?2:0); 
        wI.value=(w*f).toFixed(isImp?2:0); 
    });
    [lI,wI].forEach(e=>e?.addEventListener('input',()=>{ preset.value='custom'; }));
    document.querySelectorAll('.grain-btn').forEach(b=>b.addEventListener('click',()=>{ document.querySelectorAll('.grain-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); }));
    document.getElementById('optimize-btn')?.addEventListener('click', optimize);
    document.addEventListener('click', (e) => {
        if (_st.doneDropdownOpen && !e.target.closest('#done-stat-wrap')) {
            _st.doneDropdownOpen = false;
            document.getElementById('done-stat-chip')?.classList.remove('open');
            document.getElementById('done-dropdown-menu')?.classList.remove('open');
        }
    });

    // Re-render dynamic content when language or unit changes
    window.addEventListener('avl:langChanged', () => {
        if (_st.lastResult) {
            const { boards, W, H, padL, padR, padT, padB, allItems, unplaceable, grain } = _st.lastResult;
            renderOutput(boards, W, H, padL, padR, padT, padB, allItems, unplaceable, grain);
            buildCutList(_st.lastBoardMap);
            buildCabLegend();
            attachSVGClickHandler();
        }
        updateGrainVis();
    });

    window.addEventListener('avl:unitChanged', () => {
        updateCuttingUnitLabels();
        if (_st.lastResult) {
            runOptimization();
        }
    });
});

})();
