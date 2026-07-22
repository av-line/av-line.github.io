// avl-report_save.js — State snapshot: download tabledata.js with embedded checkbox states
// Depends on: tabledata.js (reportData must be in scope before this script runs)
//
// Public API (window.AVL_SAVE):
//   .download()     — build enriched snapshot and trigger browser download
//   .restoreAll()   — on page load: if reportData has JSON_STATE="SAVED", seed all localStorage keys
//                     from the embedded fields in reportData.Project
//
// Field contract in the downloaded tabledata.js:
//   reportData.Project.JSON_STATE            = "SAVED"
//   reportData.Project.TABLEDATA_LAST_SAVED   = ISO-8601 timestamp string
//   reportData.Project.cb_prog_done[]         = array of uid strings (programs done)
//   reportData.Project.cb_lam_done[]          = array of uid strings (laminates done)
//   reportData.Project.cb_cut_done{}          = { "<matRef>": [uid, ...] } (cutting done, per-material)
//
// The original CAD/SWOOD export never contains these fields — they are purely injected
// by this module at download time and read back at restore time.

(function () {
    'use strict';

    // ── Storage key registry (must match the keys used in each table module) ────────
    const KEY_PROG           = 'avl_prog_done';
    const KEY_LAM            = 'avl_lam_done';
    const CUT_STORAGE_PREFIX = 'avl_cut_done__'; // matches avl-report_cutting.js

    // ── Helper: deep-clone a plain object / array via JSON round-trip ────────────────
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // ── Helper: safe localStorage read → Set ────────────────────────────────────────
    function lsSet(key) {
        try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
        catch (e) { return new Set(); }
    }

    // ── Helper: safe localStorage write ─────────────────────────────────────────────
    function lsSave(key, set) {
        try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) { }
    }

    // ── Build the enriched reportData clone ─────────────────────────────────────────
    // Injects three project-level meta fields and the two done-array fields.
    // All other data is preserved byte-for-byte from the loaded reportData.
    function buildSnapshot() {
        if (typeof reportData === 'undefined') {
            throw new Error('AVL_SAVE: reportData is not defined. Make sure tabledata.js is loaded first.');
        }

        const snap = deepClone(reportData);

        // ── Inject project-level state fields ──
        snap.Project.JSON_STATE          = 'SAVED';
        snap.Project.TABLEDATA_LAST_SAVED = new Date().toISOString();

        // ── Inject done-sets as plain arrays ──
        snap.Project.cb_prog_done = [...lsSet(KEY_PROG)];
        snap.Project.cb_lam_done  = [...lsSet(KEY_LAM)];

        // ── Inject cut-done as { matRef: [id, ...] } object ──
        const cutDone = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(CUT_STORAGE_PREFIX)) {
                const matRef = k.slice(CUT_STORAGE_PREFIX.length);
                try { cutDone[matRef] = JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { cutDone[matRef] = []; }
            }
        }
        snap.Project.cb_cut_done = cutDone;

        return snap;
    }

    // ── Serialise snapshot to a valid JS module file ─────────────────────────────────
    // Output is: const reportData = { … };\n
    // Uses 2-space indentation for readability and minimal file size overhead.
    function serialise(snap) {
        return 'const reportData = ' + JSON.stringify(snap, null, 2) + ';\n';
    }

    // ── Trigger browser file download ────────────────────────────────────────────────
    function triggerDownload(content, filename) {
        const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        // Revoke after a short delay to let the browser pick it up
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 1000);
    }

    // ── Public: download() ───────────────────────────────────────────────────────────
    function download() {
        let snap;
        try {
            snap = buildSnapshot();
        } catch (err) {
            console.error(err);
            alert(err.message);
            return;
        }

        const js       = serialise(snap);
        const filename = 'tabledata.js';
        triggerDownload(js, filename);

        // Optional: update the visual "last saved" indicator if present on this page
        _updateSavedBadge(snap.Project.TABLEDATA_LAST_SAVED);
    }

    // ── Public: restoreAll() ─────────────────────────────────────────────────────────
    // Call this ONCE at the very start of each page (before loadDone() in table modules).
    // If the loaded reportData has JSON_STATE="SAVED", the embedded done-arrays are
    // written into localStorage so that subsequent loadDone() calls pick them up.
    // localStorage always wins over nothing; if localStorage already has data for this
    // session we leave it alone to preserve any in-session changes made after the file
    // was last saved.
    function restoreAll() {
        if (typeof reportData === 'undefined') return;
        const prj = reportData.Project;
        if (!prj || prj.JSON_STATE !== 'SAVED') return;

        // Only seed localStorage if it is currently empty for that key —
        // this means "file wins on first load of a saved file, live session wins thereafter"
        _seedIfEmpty(KEY_PROG, prj.cb_prog_done);
        _seedIfEmpty(KEY_LAM,  prj.cb_lam_done);

        // Restore per-material cut-done sets
        if (prj.cb_cut_done && typeof prj.cb_cut_done === 'object') {
            Object.entries(prj.cb_cut_done).forEach(([matRef, ids]) => {
                if (Array.isArray(ids) && ids.length > 0) {
                    const key = CUT_STORAGE_PREFIX + matRef;
                    const existing = localStorage.getItem(key);
                    if (!existing || existing === '[]') {
                        try { localStorage.setItem(key, JSON.stringify(ids)); } catch (e) { }
                    }
                }
            });
        }
    }

    function _seedIfEmpty(key, arr) {
        if (!Array.isArray(arr) || arr.length === 0) return;
        const existing = localStorage.getItem(key);
        if (!existing || existing === '[]') {
            lsSave(key, new Set(arr));
        }
    }

    // ── Internal: update the download button tooltip with last-saved date/time ───────
    function _updateSavedBadge(isoStr) {
        const btn = document.getElementById('save-state-btn');
        if (!btn) return;
        try {
            const d   = new Date(isoStr);
            const pad = n => String(n).padStart(2, '0');
            const formatted = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            // Build the tooltip: base i18n label + date
            const base = (window.AVL_LANG ? window.AVL_LANG.t('ui.save.tooltip') : 'Save progress');
            btn.title = `${base}\n${formatted}`;
        } catch (e) { /* non-critical */ }
    }

    // ── On load: show existing saved-date from file (if any) ────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        if (typeof reportData === 'undefined') return;
        const prj = reportData.Project;
        if (prj && prj.JSON_STATE === 'SAVED' && prj.TABLEDATA_LAST_SAVED) {
            _updateSavedBadge(prj.TABLEDATA_LAST_SAVED);
        }
    });

    // ── Expose public API ────────────────────────────────────────────────────────────
    window.AVL_SAVE = { download, restoreAll };

})();
