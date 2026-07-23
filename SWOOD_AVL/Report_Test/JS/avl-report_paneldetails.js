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

// Event listeners via delegation (works regardless of DOM injection timing)
document.addEventListener("click", function (e) {
    if (e.target.closest("#modal-close")) {
        closePanelModal();
        return;
    }

    if (e.target.closest("#modal-prev")) {
        if (currentRow) {
            const prev = currentRow.getPrevRow();
            if (prev) { currentRow = prev; updateModalContent(); prev.scrollTo(); }
        }
        return;
    }

    if (e.target.closest("#modal-next")) {
        if (currentRow) {
            const next = currentRow.getNextRow();
            if (next) { currentRow = next; updateModalContent(); next.scrollTo(); }
        }
        return;
    }

    if (e.target.closest("#modal-print-lbl")) {
        if (currentRow && typeof window.generatePDFLabels === 'function') {
            const data = currentRow.getData();
            window.generatePDFLabels([data], `${data.FILENAME || 'Label'}`);
        }
        return;
    }

    const modal = document.getElementById("panel-modal");
    if (modal && e.target === modal) {
        closePanelModal();
    }
});

// Keyboard: Escape closes, Arrow keys navigate
document.addEventListener("keydown", function (e) {
    const modal = document.getElementById("panel-modal");
    if (!modal || !modal.classList.contains("open")) return;
    if (e.key === "Escape") { closePanelModal(); return; }
    
    const prevBtn = document.getElementById("modal-prev");
    const nextBtn = document.getElementById("modal-next");
    if (e.key === "ArrowLeft"  && prevBtn && !prevBtn.disabled) prevBtn.click();
    if (e.key === "ArrowRight" && nextBtn && !nextBtn.disabled) nextBtn.click();
});

// Refresh modal content dynamically when unit format changes
window.addEventListener("avl:unitChanged", function () {
    const modal = document.getElementById("panel-modal");
    if (modal && modal.classList.contains("open") && currentRow) {
        updateModalContent();
    }
});
