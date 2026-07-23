const fs = require('fs');

// Read the tabledata.js file
const content = fs.readFileSync('c:\\_AVLine\\DevReport\\_SOURCE\\JS\\tabledata.js', 'utf8');

// Strip "const reportData = " and parse
const jsonText = content.replace(/^\s*const\s+reportData\s*=\s*/, '').replace(/;\s*$/, '');
const data = JSON.parse(jsonText);

console.log("PROJECT DETAILS:");
console.log("Filename:", data.Project.FILENAME);

console.log("\nSMALLPARTS:");
const smallParts = data.Project.SMALLPART ? (Array.isArray(data.Project.SMALLPART) ? data.Project.SMALLPART : [data.Project.SMALLPART]) : [];
console.log("Total SmallParts:", smallParts.length);
smallParts.forEach(sp => {
    console.log(`- SP: FILENAME=${sp.FILENAME}, BPINDEX=${sp.BPINDEX}, SPINDEX=${sp.SPINDEX}`);
});

console.log("\nBIGPARTS:");
const bigParts = data.Project.BIGPART ? (Array.isArray(data.Project.BIGPART) ? data.Project.BIGPART : [data.Project.BIGPART]) : [];
console.log("Total BigParts:", bigParts.length);
bigParts.forEach(bp => {
    console.log(`- BP: BPINDEX=${bp.BPINDEX}, FILENAME=${bp.FILENAME}, BP_MATREF=${bp.BP_MATREF}, BP_LAMTOP=${bp.BP_LAMTOP}, BP_LAMBOT=${bp.BP_LAMBOT}, QUANTITY=${bp.QUANTITY}`);
});

console.log("\nINTERNALPRODUCTION PARTS WITH LAMINATE FU_LA_G_1:");
const intProd = data.Project.INTERNALPRODUCTION ? (Array.isArray(data.Project.INTERNALPRODUCTION) ? data.Project.INTERNALPRODUCTION : [data.Project.INTERNALPRODUCTION]) : [];
intProd.forEach(part => {
    const hasLam = part.PAN_LAMTOP_MATREF === 'FU_LA_G_1' || part.PAN_LAMBOT_MATREF === 'FU_LA_G_1';
    if (hasLam) {
        const isSmall = smallParts.some(sp => sp.FILENAME === part.FILENAME);
        console.log(`- Part: FILENAME=${part.FILENAME}, DESC=${part.DESCRIPTION}, QTY=${part.QTY}, LAM_TOP=${part.PAN_LAMTOP_MATREF}, LAM_BOT=${part.PAN_LAMBOT_MATREF}, L=${part.PAN_LWEB}, W=${part.PAN_WWEB}, isSmallPart=${isSmall}`);
    }
});
