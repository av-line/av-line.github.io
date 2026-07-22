/* avl-report_lang.js
   Expanded i18n dictionary for AV-Line Report
   Usage: window.AVL_LANG.t(key, params)
*/

(function () {
  const dict = {
    de: {
      // Sidebar
      "menu.overview": "Übersicht",
      "menu.cabinets": "Baugruppen",
      "menu.panels": "Fertigungsteile",
      "menu.laminates": "Beläge",
      "menu.cncprograms": "CNC Programme",
      "menu.cutting": "Schnittplan",
      "menu.summary": "Materialsummen",
      "menu.fittings": "Beschläge",
      "menu.purchase": "Zukaufteile",
      "menu.bigparts": "Großteile",

      // Page specific titles
      "page.title.dashboard": "Dashboard Übersicht",
      "page.welcome": "Willkommen im Dashboard! Nutze das Menü zum Navigieren, klappe die Sidebar ein/aus oder schalte zwischen Hell/Dunkel um.",
      "page.title.cabinets": "Baugruppen",
      "page.title.panels": "Fertigungsteile",
      "page.title.laminates": "Beläge",
      "page.title.cutting": "Schnittplan",
      "page.title.programs": "CNC Programme",
      "page.title.fittings": "Beschläge",
      "page.title.purchase": "Zukaufteile",
      "page.title.summary": "Materialsummen",
      "page.title.bigparts": "Großteile",

      // PDF Report
      "pdf.toc.title": "Inhaltsverzeichnis",
      "pdf.index.suffix": " (Index)",
      "pdf.details.suffix": " (Details)",
      "pdf.cont.suffix": " (Forts.)",
      "pdf.project_report": "Projekt Report",
      "pdf.export.title": "PDF Export",
      "pdf.export.generate": "PDF Erstellen",
      "pdf.export.cancel": "Abbrechen",
      "pdf.loading": "Lade Bilder...",

      // UI
      "ui.lang": "Sprache",
      "ui.theme": "Design umschalten",
      "ui.lang.de": "Deutsch",
      "ui.lang.en": "Englisch",
      "ui.units": "Einheit",
      "ui.units.metric": "Metrisch (mm)",
      "ui.units.imperial_decimal": "Imperial (Dezimal)",
      "ui.units.imperial_fraction": "Imperial (Bruch)",
      "ui.csv": "CSV-Trennzeichen",
      "ui.csv.semicolon": "Semikolon (;)",
      "ui.csv.comma": "Komma (,)",
      "ui.csv.tab": "TAB",
      "ui.offline.export": "Offline-Report herunterladen",
      "ui.offline.report": "Offline Report",

      // Table & Data texts
      "ui.totalitems": "Gesamt: {count} Einträge",
      "ui.search": "In allen Daten suchen...",
      "ui.group.none": "Keine Gruppierung",
      "ui.group.type": "Gruppieren nach Typ",
      "ui.factor": "Faktor",
      "ui.summarize": "Zusammenfassen",
      "ui.edges": "Kanten",
      "ui.edges.l": "L",
      "ui.edges.r": "R",
      "ui.edges.f": "V",
      "ui.edges.b": "H",
      "ui.lam": "Belag",
      "ui.lam.o": "O",
      "ui.lam.u": "U",
      "ui.cnc": "CNC",
      "ui.compinfo": "Bauteil Info",
      "ui.cabinfo": "Schrank Info",
      "ui.snr": "SNR:",
      "ui.desc_short": "Bez:",
      "ui.qty_short": "Anz:",
      "ui.file": "Datei:",
      "ui.fitinfo": "Beschlag Info",
      "ui.supplier": "Lieferant:",
      "ui.suppliercode": "ArtNr:",

      // Types
      "type.INTERNALPRODUCTION": "Fertigungsteile",
      "type.EXTERNALPRODUCTION": "Fremdfertigung",
      "type.FITTING": "Beschläge",
      "type.nocab": "NoCab Komponenten",

      // Table Headers
      "th.cabsnr": "Cab",
      "th.cablist": "List",
      "th.desc": "Beschreibung",
      "th.panelid": "Bauteil ID",
      "th.matref": "Material",
      "th.matdesc": "Materialbeschreibung",
      "th.length": "Länge",
      "th.width": "Breite",
      "th.thickness": "Dicke",
      "th.rawlength": "Roh L",
      "th.rawwidth": "Roh B",
      "th.rawthickness": "Roh D",
      "th.summary": "Summe",
      "th.lamref": "Belag",
      "th.lamdesc": "Belagsbeschreibung",
      "th.lamthickness": "Belagsdicke",
      "th.ebref": "Kante",
      "th.ebdesc": "Kantenbeschreibung",
      "th.ebthickness": "Kantendicke",
      "th.quantity": "Menge",
      "th.supplier": "Lieferant",
      "th.suppliercode": "Artikelnr. Lief",
      "th.descext": "Zusatzbeschreibung",
      "th.comment": "Kommentar",
      "th.thumbnail": "Vorschau",
      "th.graphic": "Grafik",
      "th.edges": "Kanten",
      "th.noedges": "Keine Kanten",
      "th.kanteninfo": "Kanteninfo",
      "th.belaginfo": "Belag Info",
      "th.weblink": "Link",
      "th.lamlocation": "Lage",
      "th.lammaterial": "Material",
      "th.lamlength": "Länge Belag",
      "th.lamwidth": "Breite Belag",
      "th.lamgrain": "Richtung Belag",
      "th.substratemat": "Trägermaterial",
      "th.substrateraw": "Rohmaße Träger",
      "th.calibrate": "Kalibrieren",
      "th.substratethick": "Träger Dicke kalibriert",
      "th.finishdim": "Fertigmaße Bauteil",
      "th.phase": "Phase",
      "th.qr": "QR",
      "th.cncprogram": "CNC Programm",
      "th.tools": "Werkzeuge",
      "th.time": "Zeit (s)",
      "th.lxb": "L×B",
      "th.bpindex": "BP",
      "th.spindex": "SP",
      "th.bp_summary": "Großteil Zusammenfassung",
      "th.smallparts": "Kleinteile",
      "th.bp_info": "Großteil Info",

      // New PDF report header translations
      "th.cabinets": "Baugruppen",
      "th.cablistsnr": "Liste SNR",
      "th.ou": "O/U",
      "th.lamsummary": "Belag Zusammenfassung (m²)",
      "th.l_short": "L",
      "th.w_short": "B",
      "th.t_short": "D",
      "th.qty": "Anz",
      "th.edgeinfo": "Kanteninfo",
      "th.laminfo": "Belag Info",
      "th.cnc": "CNC",
      "th.lxw": "L × B",
      "th.timesec": "Zeit (s)",
      "th.calibration": "Kalibrierung",
      "pdf.header.title": "AV-LINE PROJEKT REPORT",
      "pdf.footer.project": "Projekt",
      "pdf.footer.file": "Datei",

      // Section Headers
      "section.material": "Material Zusammenfassung",
      "section.edgeband": "Kanten Zusammenfassung",
      "section.laminate": "Belags Zusammenfassung",
      "section.fittings": "Beschläge",
      "section.fittings_lv": "Beschläge LV",
      "section.notfound.mat": "Keine Materialdaten gefunden",
      "section.notfound.eb": "Keine Kantendaten gefunden",
      "section.notfound.lam": "Keine Belagsdaten gefunden",

      // Export Menus
      "ui.export.tooltip": "Speichern / Exportieren",
      "ui.export.csv": "Als CSV exportieren",
      "ui.export.xlsx": "Als XLSX exportieren",
      "ui.export.all.csv": "Alle als CSV exportieren",
      "ui.export.all.xlsx": "Alle als XLSX exportieren",

      // Save state
      "ui.save.tooltip": "Status speichern & tabledata.js herunterladen",
      "ui.save.label": "Status speichern",
      "ui.save.badge.none": "Nicht gespeichert",

      // Footer
      "foot.cus": "Kunde:",
      "foot.projnr": "ProjNr:",
      "foot.eng": "Bearb:",
      "foot.projname": "ProjName:",
      "foot.projpos": "ProjPos:",
      "foot.report": "Report:",

      // Dashboard specific
      "dash.prjnr": "Projekt Nr",
      "dash.position": "Position",
      "dash.leader": "Projektleiter",
      "dash.engineer": "Bearbeiter",
      "dash.comment": "Kommentar",
      "dash.reporttype": "Report Typ",
      "dash.version": "Version",
      "dash.breakdown": "Bauteil Übersicht",
      "dash.parts": "Fertigungsteile",
      "dash.fittings": "Beschläge",
      "dash.cnc": "CNC-Dateien",
      "dash.purchased": "Zukaufteile",
      "ui.generating_overview": "Erstelle Übersicht...",
      "ui.generating_cabs_index": "Erstelle Schrankindex...",
      "ui.generating_cab": "Erstelle Schrankdetails",
      "ui.generating_panels": "Erstelle Fertigungsteile...",
      "ui.generating_fittings": "Erstelle Beschlagliste...",
      "ui.generating_purchase": "Erstelle Zukaufliste...",
      "ui.generating_summaries": "Erstelle Materialsummen...",
      "ui.rendering_page": "Render Seite",
      "ui.generating_pdf_title": "PROJEKT REPORT",

      // Modals
      "modal.paneldetails": "Bauteildetails",
      "modal.close": "Zurück",
      "modal.prev": "Vorheriges Bauteil",
      "modal.next": "Nächstes Bauteil",

      // Label print folder dialog
      "label.dialog.title": "Bauteilbilder einbetten?",
      "label.dialog.body": "Um Bauteilbilder in das PDF einzubetten, den Labels-Ordner im nächsten Dialog auswählen. Pfad kopieren und in die Adressleiste einfügen.",
      "label.dialog.copy": "Kopieren",
      "label.dialog.copied": "Kopiert!",
      "label.dialog.skip": "Ohne Bilder",
      "label.dialog.select": "Ordner auswählen",

      // Viewer Controls
      "viewer.controls_title": "Steuerung",
      "viewer.rotate_title": "Drehen",
      "viewer.rotate_desc": "Mittlere Maustaste ziehen",
      "viewer.pan_title": "Verschieben",
      "viewer.pan_desc": "Rechte Maustaste ziehen",
      "viewer.zoom_title": "Zoomen",
      "viewer.zoom_desc": "Mausrad hoch / runter",
      "viewer.select_title": "Auswählen",
      "viewer.select_desc": "Linke Maustaste klicken",
      "viewer.no_image_found": "Kein Bild der Baugruppe gefunden.",

      // Cutting Plan page
      "cut.page.title": "Schnittplan",
      "cut.page.subtitle": "Guillotine-Algorithmus · Plattenaufteilung",
      "cut.ctrl.cabinet": "Baugruppen",
      "cut.ctrl.cab.all": "Alle Baugruppen",
      "cut.ctrl.material": "Material",
      "cut.ctrl.preset": "Plattengröße Voreinstellung",
      "cut.ctrl.dimensions": "Plattenmaße",
      "cut.ctrl.grain": "Maserungsrichtung",
      "cut.ctrl.grain.h": "→ Horizontal",
      "cut.ctrl.grain.v": "↓ Vertikal",
      "cut.ctrl.grain.info": "Material auswählen um Maserungsinfo zu sehen.",
      "cut.ctrl.kerf": "Sägeblatt / Schnittfuge",
      "cut.ctrl.padding": "Plattenrand / Anschnitt",
      "cut.ctrl.pad.l": "L",
      "cut.ctrl.pad.r": "R",
      "cut.ctrl.pad.t": "O",
      "cut.ctrl.pad.b": "U",
      "cut.btn.optimize": "Optimieren",
      "cut.empty.hint": "Material und Plattengröße wählen, dann auf Optimieren klicken.",
      "cut.stat.boards": "Platten",
      "cut.stat.placed": "Platziert",
      "cut.stat.efficiency": "Effizienz",
      "cut.stat.waste": "Verschnitt",
      "cut.warn.exceed": "{n} Teil(e) überschreiten Plattengröße:",
      "cut.slide.board": "Platte",
      "cut.slide.of": "von",
      "cut.slide.prev": "Zurück",
      "cut.slide.next": "Weiter",
      "cut.list.title": "Schnittliste",
      "cut.list.done": "{done}/{total} erledigt",
      "cut.list.col.desc": "Beschreibung",
      "cut.list.col.mm": "mm",
      "cut.list.col.brd": "Pl.",
      "cut.list.board": "Platte",
      "cut.list.cut": "Schnitt",
      "cut.list.alldone": "Alle Teile als geschnitten markiert!",
      "cut.list.markcutbtn": "Als geschnitten markieren",
      "cut.list.reopt": "Neu optimieren ({rem} verbleibend)",
      "cut.list.selected": "{n} ausgewählt",
      "cut.legend.title": "Schränke in diesem Material",
      "cut.noparts": "Keine Teile für dieses Material gefunden.",
      "cut.allcut": "Alle Teile wurden als geschnitten markiert!",
      "cut.grain.locked": "{grain} maserungsgesperrte Teil(e) folgen dieser Richtung. {free} können frei gedreht werden.",
      "cut.zoom.in": "Hereinzoomen",
      "cut.zoom.out": "Herauszoomen",
      "cut.zoom.reset": "Zoom zurücksetzen",
      "dash.edrawings.title": "Interaktives 3D-Modell laden",
      "dash.edrawings.desc": "SolidWorks eDrawing (25MB+)"
    },

    en: {
      // Sidebar
      "menu.overview": "Overview",
      "menu.cabinets": "Cabinets",
      "menu.panels": "Panels",
      "menu.laminates": "Laminated Parts",
      "menu.cncprograms": "CNC Programs",
      "menu.cutting": "Cutting Plan",
      "menu.summary": "Summary",
      "menu.fittings": "Fittings",
      "menu.purchase": "Purchase",
      "menu.bigparts": "Big Parts",

      // Page
      "page.title.dashboard": "Dashboard Overview",
      "page.welcome": "Welcome to your dashboard! Use the menu to navigate, toggle the sidebar, or switch between light and dark themes to personalize your experience.",
      "page.title.cabinets": "Cabinets",
      "page.title.panels": "Panels Data",
      "page.title.laminates": "Laminated Parts",
      "page.title.cutting": "Cutting Plan",
      "page.title.programs": "CNC Programs",
      "page.title.fittings": "Fittings Data",
      "page.title.purchase": "Purchased Parts",
      "page.title.summary": "Summary Data",
      "page.title.bigparts": "Big Parts",

      // PDF Report
      "pdf.toc.title": "Table of Contents",
      "pdf.index.suffix": " (Index)",
      "pdf.details.suffix": " (Details)",
      "pdf.cont.suffix": " (cont.)",
      "pdf.project_report": "Project Report",
      "pdf.export.title": "PDF Export",
      "pdf.export.generate": "Generate PDF",
      "pdf.export.cancel": "Cancel",
      "pdf.loading": "Pre-loading images...",

      // UI
      "ui.lang": "Language",
      "ui.theme": "Toggle theme",
      "ui.lang.de": "German",
      "ui.lang.en": "English",
      "ui.units": "Unit Format",
      "ui.units.metric": "Metric (mm)",
      "ui.units.imperial_decimal": "Imperial (decimal)",
      "ui.units.imperial_fraction": "Imperial (fraction)",
      "ui.csv": "CSV Delimiter",
      "ui.csv.semicolon": "Semicolon (;)",
      "ui.csv.comma": "Comma (,)",
      "ui.csv.tab": "TAB",
      "ui.offline.export": "Download Offline Report",
      "ui.offline.report": "Offline Report",

      // Table & Data texts
      "ui.totalitems": "Total: {count} Items",
      "ui.search": "Search across all data...",
      "ui.group.none": "No Grouping",
      "ui.group.type": "Group by Type",
      "ui.factor": "Factor",
      "ui.summarize": "Summarize",
      "ui.edges": "Edges",
      "ui.edges.l": "L",
      "ui.edges.r": "R",
      "ui.edges.f": "F",
      "ui.edges.b": "B",
      "ui.lam": "Laminate",
      "ui.lam.o": "T",
      "ui.lam.u": "B",
      "ui.cnc": "CNC",
      "ui.compinfo": "Component Info",
      "ui.cabinfo": "Cabinet Info",
      "ui.snr": "SNR:",
      "ui.desc_short": "Desc:",
      "ui.qty_short": "Qty:",
      "ui.file": "File:",
      "ui.fitinfo": "Fitting Info",
      "ui.supplier": "Supplier:",
      "ui.suppliercode": "Code:",

      // Types
      "type.INTERNALPRODUCTION": "Production Parts",
      "type.EXTERNALPRODUCTION": "External Production",
      "type.FITTING": "Fittings",
      "type.nocab": "NoCab Components",

      // Table Headers
      "th.cabsnr": "Cab",
      "th.cablist": "List",
      "th.desc": "Description",
      "th.panelid": "Panel ID",
      "th.matref": "Material",
      "th.matdesc": "Material Desc",
      "th.length": "Length",
      "th.width": "Width",
      "th.thickness": "Thickness",
      "th.rawlength": "Raw L",
      "th.rawwidth": "Raw W",
      "th.rawthickness": "Raw T",
      "th.summary": "Summary",
      "th.lamref": "LAM REF",
      "th.lamdesc": "LAM Description",
      "th.lamthickness": "LAM Thickness",
      "th.ebref": "EB REF",
      "th.ebdesc": "EB Description",
      "th.ebthickness": "EB Thickness",
      "th.quantity": "Quantity",
      "th.supplier": "Supplier",
      "th.suppliercode": "Supplier Code",
      "th.descext": "Description EXT",
      "th.comment": "Comment",
      "th.thumbnail": "Thumbnail",
      "th.graphic": "Graphic",
      "th.edges": "Edges",
      "th.noedges": "No Edges",
      "th.kanteninfo": "Edge Info",
      "th.belaginfo": "Lam Info",
      "th.weblink": "Link",
      "th.lamlocation": "Location",
      "th.lammaterial": "Material",
      "th.lamlength": "Laminate Length",
      "th.lamwidth": "Laminate Width",
      "th.lamgrain": "Laminate Grain",
      "th.substratemat": "Substrate Material",
      "th.substrateraw": "Substrate Raw Dims",
      "th.calibrate": "Calibration",
      "th.substratethick": "Substrate Thickness (Calib)",
      "th.finishdim": "Finish Panel Dims",
      "th.phase": "Phase",
      "th.qr": "QR",
      "th.cncprogram": "CNC Program",
      "th.tools": "Tools",
      "th.time": "Time (s)",
      "th.lxb": "L×W",
      "th.bpindex": "Big Part Index",
      "th.spindex": "Small Part Index",
      "th.bp_summary": "Big Part Summary",
      "th.smallparts": "Small Parts",
      "th.bp_info": "Big Part Info",

      // New PDF report header translations
      "th.cabinets": "Cabinets",
      "th.cablistsnr": "Cab List SNR",
      "th.ou": "T/O",
      "th.lamsummary": "Laminate Summary (m²)",
      "th.l_short": "L",
      "th.w_short": "W",
      "th.t_short": "T",
      "th.qty": "Qty",
      "th.edgeinfo": "Edge Info",
      "th.laminfo": "Lam Info",
      "th.cnc": "CNC",
      "th.lxw": "L × W",
      "th.timesec": "Time (s)",
      "th.calibration": "Calibration",
      "pdf.header.title": "AV-LINE PROJECT REPORT",
      "pdf.footer.project": "Project",
      "pdf.footer.file": "File",

      // Section Headers
      "section.material": "Material Summary",
      "section.edgeband": "Edgeband Summary (lm)",
      "section.laminate": "Laminate Summary (m²)",
      "section.fittings": "Fittings",
      "section.fittings_lv": "Fittings LV",
      "section.notfound.mat": "No Material Data Found",
      "section.notfound.eb": "No Edgeband Data Found",
      "section.notfound.lam": "No Laminate Data Found",

      // Export Menus
      "ui.export.tooltip": "Save / Export Details",
      "ui.export.csv": "Export to CSV",
      "ui.export.xlsx": "Export to XLSX",
      "ui.export.all.csv": "Export All to CSV",
      "ui.export.all.xlsx": "Export All to XLSX",

      // Save state
      "ui.save.tooltip": "Save progress & download tabledata.js",
      "ui.save.label": "Save progress",
      "ui.save.badge.none": "Not saved",

      // Footer
      "foot.cus": "Cus:",
      "foot.projnr": "ProjNr:",
      "foot.eng": "Eng:",
      "foot.projname": "ProjName:",
      "foot.projpos": "ProjPos:",
      "foot.report": "Report:",

      // Dashboard specific
      "dash.prjnr": "Project Nr",
      "dash.position": "Position",
      "dash.leader": "Project Leader",
      "dash.engineer": "Engineer",
      "dash.comment": "Comment",
      "dash.reporttype": "Report Type",
      "dash.version": "Version",
      "dash.breakdown": "Component Breakdown",
      "dash.parts": "Production Parts",
      "dash.fittings": "Fittings",
      "dash.cnc": "CNC-Files",
      "dash.purchased": "Purchased Parts",
      "ui.generating_overview": "Generating Overview...",
      "ui.generating_cabs_index": "Generating Cabinets Index...",
      "ui.generating_cab": "Generating Cabinet Details",
      "ui.generating_panels": "Generating Panels List...",
      "ui.generating_fittings": "Generating Fittings List...",
      "ui.generating_purchase": "Generating Purchase List...",
      "ui.generating_summaries": "Generating Summaries...",
      "ui.rendering_page": "Rendering Page",
      "ui.generating_pdf_title": "PROJECT REPORT",

      // Modals
      "modal.paneldetails": "Panel Details",
      "modal.close": "Back",
      "modal.prev": "Previous Panel",
      "modal.next": "Next Panel",

      // Label print folder dialog
      "label.dialog.title": "Include Label Images?",
      "label.dialog.body": "To embed part images in the PDF, select the Labels folder in the next dialog. Copy the path below and paste it into the dialog address bar.",
      "label.dialog.copy": "Copy",
      "label.dialog.copied": "Copied!",
      "label.dialog.skip": "Skip Images",
      "label.dialog.select": "Select Folder",

      // Viewer Controls
      "viewer.controls_title": "Controls",
      "viewer.rotate_title": "Rotate",
      "viewer.rotate_desc": "Middle mouse button drag",
      "viewer.pan_title": "Pan",
      "viewer.pan_desc": "Right mouse button drag",
      "viewer.zoom_title": "Zoom",
      "viewer.zoom_desc": "Scroll wheel up / down",
      "viewer.select_title": "Select",
      "viewer.select_desc": "Left mouse click",
      "viewer.no_image_found": "No IMG of the Cabinet founded.",

      // Cutting Plan page
      "cut.page.title": "Cutting Plan",
      "cut.page.subtitle": "Guillotine algorithm · Beam saw pattern",
      "cut.ctrl.cabinet": "Cabinets",
      "cut.ctrl.cab.all": "All Cabinets",
      "cut.ctrl.material": "Material",
      "cut.ctrl.preset": "Board Size Preset",
      "cut.ctrl.dimensions": "Board Dimensions",
      "cut.ctrl.grain": "Board Grain Direction",
      "cut.ctrl.grain.h": "→ Horizontal",
      "cut.ctrl.grain.v": "↓ Vertical",
      "cut.ctrl.grain.info": "Select a material to see grain info.",
      "cut.ctrl.kerf": "Saw Blade / Kerf",
      "cut.ctrl.padding": "Board Margins / Padding",
      "cut.ctrl.pad.l": "L",
      "cut.ctrl.pad.r": "R",
      "cut.ctrl.pad.t": "T",
      "cut.ctrl.pad.b": "B",
      "cut.btn.optimize": "Optimize",
      "cut.empty.hint": "Select a material and board size, then click Optimize.",
      "cut.stat.boards": "Boards",
      "cut.stat.placed": "Placed",
      "cut.stat.efficiency": "Efficiency",
      "cut.stat.waste": "Waste",
      "cut.warn.exceed": "{n} part(s) exceed board size:",
      "cut.slide.board": "Board",
      "cut.slide.of": "of",
      "cut.slide.prev": "Prev",
      "cut.slide.next": "Next",
      "cut.list.title": "Cut List",
      "cut.list.done": "{done}/{total} done",
      "cut.list.col.desc": "Description",
      "cut.list.col.mm": "mm",
      "cut.list.col.brd": "Brd",
      "cut.list.board": "Board",
      "cut.list.cut": "Cut",
      "cut.list.alldone": "All panels marked done!",
      "cut.list.markcutbtn": "Mark cut",
      "cut.list.reopt": "Re-optimize ({rem} left)",
      "cut.list.selected": "{n} selected",
      "cut.legend.title": "Cabinets in this material",
      "cut.noparts": "No parts found for this material.",
      "cut.allcut": "All panels have been marked as cut!",
      "cut.grain.locked": "{grain} grain-locked panel(s) follow this direction. {free} can rotate freely.",
      "cut.zoom.in": "Zoom In",
      "cut.zoom.out": "Zoom Out",
      "cut.zoom.reset": "Reset Zoom",
      "dash.edrawings.title": "Load Interactive 3D Model",
      "dash.edrawings.desc": "SolidWorks eDrawing (25MB+)"
    }
  };

  const fallbackLang = "en";

  function getSavedLang() {
    return localStorage.getItem("avl_lang") || document.documentElement.lang || fallbackLang;
  }

  function setLang(lang) {
    const l = dict[lang] ? lang : fallbackLang;
    localStorage.setItem("avl_lang", l);
    document.documentElement.lang = l;
    translateDOM(); // trigger DOM replacement immediately
    return l;
  }

  // Simple token replace: "Hello {name}"
  function format(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
  }

  function t(key, params, lang) {
    const l = lang || getSavedLang();
    const table = dict[l] || dict[fallbackLang] || {};
    const fb = dict[fallbackLang] || {};
    const text = table[key] ?? fb[key] ?? key;
    return format(text, params);
  }

  // Iterates over all DOM elements that have a data-i18n attribute and translates their text/placeholders
  function translateDOM() {
    // 1. Standard textContent replacement
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.innerHTML = t(key);
    });

    // 2. Placeholder replacement (like inputs/search fields)
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });

    // 4. Aria label replacement
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });

    // 5. Document Title replacement
    const titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) {
      const key = titleEl.getAttribute('data-i18n');
      document.title = "AV-Line | " + t(key);
    }

    // Publish a custom event so tables/other components know it's time to redraw headers
    window.dispatchEvent(new Event('avl:langChanged'));
  }

  // Expose globally
  window.AVL_LANG = {
    dict,
    t,
    getLang: getSavedLang,
    setLang,
    translateDOM
  };

  // Run initial DOM translation automatically when logic is parsed
  document.addEventListener("DOMContentLoaded", translateDOM);
})();
