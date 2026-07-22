/* avl-report_csv.js
   CSV Delimiter management for AV-Line Reports
   ─────────────────────────────────────────────
   Default: ';'  (European/German Excel standard)
   USA:     ','  (standard CSV)
   Universal: '\t' (TAB — locale-independent)

   Usage:
     window.AVL_CSV.getDelimiter()          → ';' | ',' | '\t'
     window.AVL_CSV.setDelimiter(',')       → persist + fire event
     window.AVL_CSV.getDelimiterLabel()     → human-readable string

   Event fired on change: 'avl:csvDelimiterChanged'
     detail: { delimiter: ',' }
*/

(function () {
    'use strict';

    const STORAGE_KEY = 'avl_csv_delimiter';
    const VALID       = [';', ',', '\t'];

    function getDelimiter() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && VALID.includes(saved)) return saved;
        return ';'; // European default
    }

    function setDelimiter(d) {
        if (!VALID.includes(d)) return;
        localStorage.setItem(STORAGE_KEY, d);
        window.dispatchEvent(new CustomEvent('avl:csvDelimiterChanged', { detail: { delimiter: d } }));
    }

    function getDelimiterLabel() {
        const d = getDelimiter();
        if (d === ',')  return 'Comma (,)';
        if (d === '\t') return 'TAB';
        return 'Semicolon (;)';
    }

    window.AVL_CSV = { getDelimiter, setDelimiter, getDelimiterLabel };

})();
