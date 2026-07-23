// avl-report_paneldetails.js — Panel modal controller + Label integration
let currentRow = null;

function openPanelModal(row) {
    if (!row) return;
    currentRow = row;
    updateModalContent();
    const modal = document.getElementById("panel-modal");
    if (modal) modal.classList.add("open");
}
window.openPanelModal = openPanelModal;
window.closePanelModal = closePanelModal;

function updateModalContent() {
    if (!currentRow) return;

    const data = currentRow.getData();
    const contentDiv = document.getElementById("modal-body-content");
    if (!contentDiv) return;

    // Delegate to labels.js renderer
    if (typeof window.renderLabel === 'function') {
        window.renderLabel(data, contentDiv);
    } else {
        // Fallback if labels.js not loaded
        contentDiv.innerHTML = `
            <div style="margin-bottom:16px;">
                <span style="color:var(--color-text-placeholder);font-size:0.9em;">Panel ID</span><br>
                <strong style="font-size:1.2em;color:var(--color-active-primary);">${data.FILENAME || '—'}</strong>
            </div>
            <div>
                <span style="color:var(--color-text-placeholder);font-size:0.9em;">Description</span><br>
                <strong>${data.DESCRIPTION || '—'}</strong>
            </div>`;
    }

    // Navigation button states
    const prevBtn = document.getElementById("modal-prev");
    const nextBtn = document.getElementById("modal-next");
    if (prevBtn) prevBtn.disabled = !currentRow.getPrevRow();
    if (nextBtn) nextBtn.disabled = !currentRow.getNextRow();
}

function closePanelModal() {
    const modal = document.getElementById("panel-modal");
    if (modal) modal.classList.remove("open");
    currentRow = null;
}

// Event listeners
document.addEventListener("DOMContentLoaded", function () {
    const closeBtn = document.getElementById("modal-close");
    const prevBtn  = document.getElementById("modal-prev");
    const nextBtn  = document.getElementById("modal-next");
    const modal    = document.getElementById("panel-modal");

    if (closeBtn) closeBtn.addEventListener("click", closePanelModal);

    // Close on backdrop click
    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === modal) closePanelModal();
        });
    }

    const printBtn = document.getElementById("modal-print-lbl");
    if (printBtn) {
        printBtn.addEventListener("click", function () {
            if (currentRow && typeof window.generatePDFLabels === 'function') {
                const data = currentRow.getData();
                window.generatePDFLabels([data], `${data.FILENAME || 'Label'}`);
            }
        });
    }

    // Keyboard: Escape closes, Arrow keys navigate
    document.addEventListener("keydown", function (e) {
        if (!modal || !modal.classList.contains("open")) return;
        if (e.key === "Escape") { closePanelModal(); return; }
        if (e.key === "ArrowLeft"  && prevBtn && !prevBtn.disabled) prevBtn.click();
        if (e.key === "ArrowRight" && nextBtn && !nextBtn.disabled) nextBtn.click();
    });

    if (prevBtn) {
        prevBtn.addEventListener("click", function () {
            if (currentRow) {
                const prev = currentRow.getPrevRow();
                if (prev) { currentRow = prev; updateModalContent(); prev.scrollTo(); }
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", function () {
            if (currentRow) {
                const next = currentRow.getNextRow();
                if (next) { currentRow = next; updateModalContent(); next.scrollTo(); }
            }
        });
    }

    // Refresh modal content dynamically when unit format changes
    window.addEventListener("avl:unitChanged", function () {
        const modal = document.getElementById("panel-modal");
        if (modal && modal.classList.contains("open") && currentRow) {
            updateModalContent();
        }
    });
});
