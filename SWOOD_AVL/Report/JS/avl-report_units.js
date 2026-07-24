/* avl-report_units.js
   Unit conversion engine for AV-Line Reports
   Conversion rules sourced from: 250826_The Imperial System.pdf
   ─────────────────────────────────────────────────────────────
   Respects Project.UNIT_FORMAT from tabledata.js as the base unit.
   If tabledata.js is metric:
     - metric (default): exact original values (mm / m² / lm)
     - imperial_decimal / imperial_fraction: recalculate from mm to inches / ft² / LF
   If tabledata.js is imperial / imperial_fraction:
     - imperial_decimal / imperial_fraction: exact original values (inches / ft² / LF)
     - metric: recalculate from inches to mm / m² / lm
*/

(function () {
    'use strict';

    const STORAGE_KEY  = 'avl_unit_format';
    const MM_PER_INCH  = 25.4;
    const MM_PER_FOOT  = 304.8;
    const M2_PER_FT2   = 0.09290304; // 1 ft² = 0.09290304 m²
    const LM_PER_LF    = 0.3048;     // 1 LF  = 0.3048 lm

    // ── Fraction helpers ────────────────────────────────────────────────────

    function gcd(a, b) { while (b) { const t = b; b = a % b; a = t; } return a; }

    function toNearestFraction(decimalPart, maxDenom) {
        maxDenom = maxDenom || 32;
        let bestNum = 0, bestDen = 1, bestDiff = Infinity;
        for (let d = 1; d <= maxDenom; d++) {
            const n = Math.round(decimalPart * d);
            const diff = Math.abs(decimalPart - n / d);
            if (diff < bestDiff) { bestDiff = diff; bestNum = n; bestDen = d; }
        }
        if (bestNum === 0 || bestNum === bestDen) return null;
        const g = gcd(bestNum, bestDen);
        return [bestNum / g, bestDen / g];
    }

    function formatFraction(inches) {
        if (inches < 0) return '-' + formatFraction(-inches);
        if (inches === 0) return '0"';

        if (inches < 0.118) return inches.toFixed(3) + '"';

        const rounded = Math.round(inches * 32) / 32;
        const whole   = Math.floor(rounded);
        const frac    = toNearestFraction(rounded - whole, 32);
        const fracStr = frac ? `${frac[0]}/${frac[1]}` : '';

        if (whole >= 12) {
            const feet     = Math.floor(whole / 12);
            const remInch  = whole % 12;
            if (fracStr) return `${feet}' - ${remInch} ${fracStr}"`;
            return `${feet}' - ${remInch}"`;
        } else {
            if (fracStr && whole > 0) return `${whole} ${fracStr}"`;
            if (fracStr)              return `${fracStr}"`;
            return `${whole}"`;
        }
    }

    // ── Format detection ────────────────────────────────────────────────────

    /** Source format declared in tabledata.js (Project.UNIT_SOURCE). Defaults to metric if absent. */
    function getSourceFormat() {
        try {
            if (typeof reportData !== 'undefined' && reportData && reportData.Project) {
                const src = (reportData.Project.UNIT_SOURCE || '').toLowerCase();
                if (src === 'imperial' || src === 'imperial_decimal' || src === 'imperial_fraction') return 'imperial_fraction';
                return 'metric';
            }
        } catch (e) {
            console.error('Error reading Project.UNIT_SOURCE:', e);
        }
        return 'metric';
    }

    /** Currently selected display format (localStorage > source default). */
    /** Parses UNIT_FORMAT to get the default display format. */
    function getDefaultDisplayFormat() {
        try {
            if (typeof reportData !== 'undefined' && reportData && reportData.Project) {
                let fmt = (reportData.Project.UNIT_FORMAT || '').toLowerCase().trim();
                if (fmt.includes('inch') || fmt.includes('imperial')) {
                    if (fmt.includes('fraction')) return 'imperial_fraction';
                    return 'imperial_decimal';
                }
                if (['metric', 'imperial_decimal', 'imperial_fraction'].includes(fmt)) return fmt;
            }
        } catch (e) { /* ignore */ }
        return getSourceFormat(); // fallback to source format if UNIT_FORMAT is missing
    }

    /** Currently selected display format (localStorage > UNIT_FORMAT > UNIT_SOURCE). */
    function getFormat() {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved && ['metric', 'imperial_decimal', 'imperial_fraction'].includes(saved)) return saved;
        return getDefaultDisplayFormat();
    }

    function setFormat(fmt) {
        sessionStorage.setItem(STORAGE_KEY, fmt);
        window.dispatchEvent(new CustomEvent('avl:unitChanged', { detail: { format: fmt } }));
    }

    // ── Core dimension formatter ─────────────────────────────────────────────

    /**
     * Format a dimension value from tabledata.js for display.
     * Respects Project.UNIT_FORMAT as the base unit.
     */
    function formatDim(rawVal, opts = {}) {
        const val = parseFloat(rawVal);
        if (isNaN(val)) return (rawVal != null ? String(rawVal) : '-');

        const displayFmt = getFormat();
        const srcFmt     = getSourceFormat();
        const decimals   = (opts.decimals !== undefined) ? opts.decimals : 2;

        let inches, mm;
        if (srcFmt === 'metric') {
            mm     = val;
            inches = val / MM_PER_INCH;
        } else {
            // Source is imperial (inches)
            inches = val;
            mm     = val * MM_PER_INCH;
        }

        if (displayFmt === 'metric') {
            return mm.toFixed(decimals);
        }
        if (displayFmt === 'imperial_decimal') {
            return opts.noSuffix ? inches.toFixed(3) : inches.toFixed(3) + '"';
        }
        // imperial_fraction
        return formatFraction(inches);
    }

    function getUnitSuffix() {
        return getFormat() === 'metric' ? 'mm' : 'in';
    }

    // ── Area / Length formatters (for summary tables) ────────────────────────

    function formatSummary(value, unit) {
        const v = parseFloat(value);
        if (isNaN(v)) return '-';
        if (unit === 'pc') return Math.round(v) + ' pc';

        const displayFmt      = getFormat();
        const isMetricDisplay = (displayFmt === 'metric');
        const isMetricSource  = (getSourceFormat() === 'metric');

        if (unit === 'm²' || unit === 'ft²') {
            let m2, ft2;
            if (isMetricSource) {
                m2  = v;
                ft2 = v / M2_PER_FT2;
            } else {
                ft2 = v;
                m2  = v * M2_PER_FT2;
            }
            return isMetricDisplay ? m2.toFixed(3) + ' m²' : ft2.toFixed(2) + ' ft²';
        }

        if (unit === 'lm' || unit === 'LF') {
            let lm, lf;
            if (isMetricSource) {
                lm = v;
                lf = v / LM_PER_LF;
            } else {
                lf = v;
                lm = v * LM_PER_LF;
            }
            return isMetricDisplay ? lm.toFixed(2) + ' lm' : lf.toFixed(2) + ' LF';
        }

        if (unit === 'm³' || unit === 'ft³') {
            let m3, ft3;
            if (isMetricSource) {
                m3  = v;
                ft3 = v * 35.3147;
            } else {
                ft3 = v;
                m3  = v / 35.3147;
            }
            return isMetricDisplay ? m3.toFixed(3) + ' m³' : ft3.toFixed(3) + ' ft³';
        }

        return v.toFixed(2) + (unit ? ' ' + unit : '');
    }

    function formatAreaFromM2(m2) {
        return formatSummary(m2, 'm²');
    }

    function formatLengthFromLM(lm) {
        return formatSummary(lm, 'lm');
    }

    function formatVolumeFromM3(m3) {
        return formatSummary(m3, 'm³');
    }

    // Global listener: Automatically re-evaluate and redraw all Tabulator tables when units change
    window.addEventListener('avl:unitChanged', function () {
        if (typeof Tabulator !== 'undefined' && Tabulator.findTable) {
            document.querySelectorAll('.tabulator, [id^="data-table"], #panels-table, #cabinets-table, #bigparts-table, #laminates-table, #cutting-table, #programs-table, #fittings-table, #purchase-table, #bp-summary-table, #detail-smallparts-table, #detail-components-table').forEach(function (el) {
                if (el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0) {
                    const tbls = Tabulator.findTable(el);
                    if (tbls && tbls.length > 0) {
                        const tbl = tbls[0];
                        const cols = tbl.getColumnDefinitions();
                        if (cols && cols.length > 0) {
                            tbl.setColumns(cols);
                        } else {
                            tbl.redraw(true);
                        }
                    }
                }
            });
        }
    });

    window.AVL_UNITS = {
        getFormat,
        setFormat,
        getSourceFormat,
        getUnitSuffix,
        formatDim,
        formatFraction,
        toNearestFraction,
        formatAreaFromM2,
        formatLengthFromLM,
        formatVolumeFromM3,
        formatSummary,
        MM_PER_INCH,
        MM_PER_FOOT,
        M2_PER_FT2,
        LM_PER_LF
    };

})();
