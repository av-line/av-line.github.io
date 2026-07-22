/**
 * avl-report_dashboard-logic.js
 * Automatically parses `tabledata.js` and injects the Project metadata
 * into the beautifully formatted dashboard left-column grid.
 */

(function () {
    const DONUT_COLORS = {
        production: "#0099d9",
        cabinets: "#3B82F6",
        bigparts: "#10B981",
        laminates: "#8B5CF6",
        programs: "#06B6D4",
        fittings: "#EC4899",
        purchase: "#84CC16"
    };

    const initDashboard = () => {
        if (typeof reportData === 'undefined' || !reportData.Project) return;
        const proj = reportData.Project;

        const getArray = (val) => Array.isArray(val) ? val : (val ? [val] : []);
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = (text !== null && text !== undefined && String(text).trim() !== "") ? text : "-";
        };

        setText("dash-prj-name", proj.PRJ_NAME);
        setText("dash-filename", proj.FILENAME);
        setText("dash-prj-nr", proj.PRJ_NR);
        setText("dash-prj-pos", proj.PRJ_POSITION);
        setText("dash-prj-leader", proj.PRJ_LEADER);
        setText("dash-engineer", proj.ENGINEER);
        setText("dash-comment", proj.COMMENT_PRJ);
        setText("dash-report-type", proj.REPORT_TYPE);
        setText("dash-report-ver", proj.REPORT_VERSION);

        const edrawingsIframe = document.getElementById("edrawings-iframe");
        const edrawingsPreview = document.getElementById("edrawings-preview");
        const edrawingsPreviewImg = document.getElementById("edrawings-preview-img");

        if (proj.FILENAME) {
            // Bind the project preview image path
            if (edrawingsPreviewImg) {
                edrawingsPreviewImg.src = "_SOURCE/IMG/Project/" + proj.FILENAME + "_PROJECT.jpg";
                
                // Graceful fallback if no project preview image is found
                edrawingsPreviewImg.onerror = () => {
                    edrawingsPreviewImg.style.display = "none";
                };
            }

            // Bind click loader event
            if (edrawingsPreview && edrawingsIframe) {
                edrawingsPreview.addEventListener("click", () => {
                    // Smoothly fade out preview overlay
                    edrawingsPreview.style.opacity = "0";
                    setTimeout(() => {
                        edrawingsPreview.style.display = "none";
                    }, 300);

                    // Load the massive 25MB+ eDrawing HTML file ONLY when requested
                    edrawingsIframe.src = "https://av-line.github.io/SWOOD_AVL/Report_Test/HTML/" + proj.FILENAME + "_eDrawings.HTML";
                });
            }
        }

        let totalCabs = getArray(proj.CABINET).length;
        let totalBigParts = getArray(proj.BIGPART).length;
        let totalParts = 0;
        let totalLaminated = 0;
        let totalCNC = 0;
        let totalFittings = 0;
        let totalPurchased = 0;

        const cabFilenames = new Set(getArray(proj.CABINET).map(c => c.FILENAME).filter(Boolean));
        getArray(proj.INTERNALPRODUCTION).forEach(part => {
            if (part.FILENAME && cabFilenames.has(part.FILENAME)) return;
            const qty = parseInt(part.QTY || part.QUANTITY || 1, 10) || 0;
            totalParts += qty;
            if (part.PAN_LAMTOP_MATREF || part.PAN_LAMBOT_MATREF) totalLaminated += qty;
            getArray(part.PROGRAMS).forEach(prog => {
                if (prog.PROG_FILENAME && String(prog.PROG_FILENAME).trim() !== "") totalCNC++;
            });
        });

        totalFittings = getArray(proj.FITTING).length + getArray(proj.FITTING_EFICAD).length;
        totalPurchased = getArray(proj.EXTERNALPRODUCTION).length;

        setText("chart-cabs", totalCabs);
        setText("chart-bigparts", totalBigParts);
        setText("chart-parts", totalParts);
        setText("chart-laminated", totalLaminated);
        setText("chart-cnc", totalCNC);
        setText("chart-fits", totalFittings);
        setText("chart-purch", totalPurchased);

        const chartData = [
            { key: "production", label: "Production Parts", value: totalParts, color: DONUT_COLORS.production },
            { key: "cabinets", label: "Cabinets", value: totalCabs, color: DONUT_COLORS.cabinets },
            { key: "bigparts", label: "Big Parts", value: totalBigParts, color: DONUT_COLORS.bigparts },
            { key: "laminates", label: "Laminated Parts", value: totalLaminated, color: DONUT_COLORS.laminates },
            { key: "programs", label: "CNC Programs", value: totalCNC, color: DONUT_COLORS.programs },
            { key: "fittings", label: "Fittings", value: totalFittings, color: DONUT_COLORS.fittings },
            { key: "purchase", label: "Purchased Parts", value: totalPurchased, color: DONUT_COLORS.purchase }
        ].filter(d => d.value > 0);

        const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);
        setText("dash-total-count", totalValue);

        const segmentsGroup = document.getElementById("donut-segments");
        if (segmentsGroup) {
            segmentsGroup.innerHTML = "";
            if (totalValue > 0) {
                let currentOffset = 0;
                const radius = 40;
                const circumference = 2 * Math.PI * radius;
                chartData.forEach(d => {
                    const percentage = (d.value / totalValue) * 100;
                    const strokeLength = (percentage / 100) * circumference;
                    const strokeOffset = (currentOffset / 100) * circumference;
                    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circle.setAttribute("class", "donut-segment");
                    circle.setAttribute("cx", "50");
                    circle.setAttribute("cy", "50");
                    circle.setAttribute("r", radius);
                    circle.setAttribute("fill", "transparent");
                    circle.setAttribute("stroke", d.color);
                    circle.setAttribute("stroke-dasharray", `${strokeLength} ${circumference - strokeLength}`);
                    circle.setAttribute("stroke-dashoffset", -strokeOffset);
                    segmentsGroup.appendChild(circle);
                    currentOffset += percentage;
                });
            }
        }

        // Sync Legend colors with fixed palette
        document.querySelectorAll('.legend-item').forEach(item => {
            const dot = item.querySelector('.legend-dot');
            const dataColor = item.getAttribute('data-color');
            let color = DONUT_COLORS.production;
            if (dataColor.includes('production')) color = DONUT_COLORS.production;
            else if (dataColor.includes('cabinets')) color = DONUT_COLORS.cabinets;
            else if (dataColor.includes('bigparts')) color = DONUT_COLORS.bigparts;
            else if (dataColor.includes('laminates')) color = DONUT_COLORS.laminates;
            else if (dataColor.includes('programs')) color = DONUT_COLORS.programs;
            else if (dataColor.includes('fittings')) color = DONUT_COLORS.fittings;
            else if (dataColor.includes('purchase')) color = DONUT_COLORS.purchase;
            
            if (dot) {
                dot.style.backgroundColor = color;
                dot.style.setProperty('--item-color', color);
            }
        });

        if (proj.CUS_LOGO && String(proj.CUS_LOGO).trim() !== '') {
            const logoEl = document.getElementById("dash-logo");
            if (logoEl) logoEl.src = "__NV/" + proj.CUS_LOGO;
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDashboard);
    } else {
        initDashboard();
    }
})();
