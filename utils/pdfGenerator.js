const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/* ----------------------------------------
   REFERENCE RANGES (AUTO DETECT)
---------------------------------------- */
function referenceRange(label) {
  const key = label.toLowerCase();

  if (key.includes('hemoglobin')) return 'M: 13.5–17.5 | F: 12.0–15.5 g/dL';
  if (key.includes('rbc')) return '4.2–5.9 x10¹²/L';
  if (key.includes('wbc')) return '4.0–11.0 x10⁹/L';
  if (key.includes('platelet')) return '150–450 x10⁹/L';

  if (key.includes('tsh')) return '0.4–4.0 mIU/L';
  if (key.includes('t3')) return '0.8–2.0 ng/dL';
  if (key.includes('t4')) return '5–12 μg/dL';
  if (key.includes('ft3')) return '2.3–4.2 pg/mL';
  if (key.includes('ft4')) return '0.8–1.7 ng/dL';

  if (key.includes('fasting')) return '< 100 mg/dL';
  if (key.includes('pp')) return '< 140 mg/dL';

  if (key.includes('alt')) return '7–56 U/L';
  if (key.includes('ast')) return '10–40 U/L';
  if (key.includes('alp')) return '44–147 U/L';
  if (key.includes('bilirubin total')) return '0.1–1.2 mg/dL';
  if (key.includes('bilirubin direct')) return '0–0.3 mg/dL';
  if (key.includes('albumin')) return '3.4–5.4 g/dL';

  return '-';
}

/* ----------------------------------------
   AUTO SUMMARY GENERATOR
---------------------------------------- */
function generateAutoSummary(values) {
  const observations = [];

  Object.keys(values).forEach(key => {
    const val = Number(values[key]);
    if (isNaN(val)) return;

    const label = key.replace(/_/g, " ").toUpperCase();
    const range = referenceRange(label);

    if (range.includes('–')) {
      let [low, high] = range.split('–').map(s => parseFloat(s.replace(/[^\d.]/g, '')));
      if (val < low) observations.push(`${label}: low (${val} vs ${range})`);
      if (val > high) observations.push(`${label}: high (${val} vs ${range})`);
    } 
    else if (range.includes('<')) {
      const bound = parseFloat(range.replace(/[^\d.]/g, ''));
      if (val >= bound) observations.push(`${label}: high (${val} ≥ ${range})`);
    }
  });

  if (observations.length === 0) {
    return [
      "All parameters are within normal limits.",
      "No immediate action is required."
    ];
  }

  return [
    observations[0],
    observations[1] || "Consult your physician for detailed evaluation."
  ];
}

/* ----------------------------------------
   MAIN PDF GENERATOR
---------------------------------------- */
async function generatePDF(test, formFields, pdfPath) {

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      /* HEADER */
      doc
        .fontSize(24)
        .fillColor("#1976d2")
        .text("Medora Diagnostics", { align: "left" });

      doc
        .fontSize(11)
        .fillColor("#444")
        .text("Generated On: " + new Date().toLocaleString(), { align: "right" });

      doc.moveDown(1.5);

      /* PATIENT INFO LEFT + TEST INFO RIGHT */
      doc
        .fontSize(12)
        .fillColor("#000")
        .text(`Patient Name: ${test.patient.name}`)
        .text(`Email: ${test.patient.email}`)
        .moveUp(2);

      doc
        .fontSize(12)
        .text(`Test: ${test.testType.name}`, 350)
        .text(`Booked At: ${new Date(test.bookedAt).toLocaleString()}`, 350)
        .text(`Scheduled At: ${new Date(test.scheduledAt).toLocaleString()}`, 350);

      doc.moveDown(2);

      /* TABLE HEADER */
      doc
        .fontSize(14)
        .fillColor("#1976d2")
        .text("Test Values", { underline: true });

      doc.moveDown(0.8);

      doc
        .fontSize(12)
        .fillColor("#333")
        .text("Parameter", 60)
        .text("Result", 260)
        .text("Reference Range", 380);

      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke("#ccc");

      let tableY = doc.y + 10;

      /* TABLE ROWS */
      Object.keys(formFields).forEach(key => {
        if (key === "summary" || key === "testId") return;

        const label = key.replace(/_/g, " ").toUpperCase();
        const result = formFields[key];
        const range = referenceRange(label);

        doc.fontSize(11).fillColor("#000");

        doc.text(label, 60, tableY);
        doc.text(String(result), 260, tableY);
        doc.text(range, 380, tableY);

        tableY += 20;

        if (tableY > 700) {
          doc.addPage();
          tableY = 60;
        }
      });

      /* SUMMARY SECTION */
      doc.moveDown(2);

      doc
        .fontSize(14)
        .fillColor("#1976d2")
        .text("Summary / Interpretation", { underline: true });

      const autoSummary = generateAutoSummary(formFields);

      doc
        .fontSize(11)
        .fillColor("#444")
        .text(`• ${autoSummary[0]}`)
        .text(`• ${autoSummary[1]}`);

      if (formFields.summary && formFields.summary.trim() !== "") {
        doc.moveDown(1);
        doc.fontSize(12).text("Additional Notes:", { underline: true });
        doc.fontSize(11).text(formFields.summary, { width: 480 });
      }

      /* SIGNATURE */
      doc.moveDown(3);
      doc
        .fontSize(11)
        .fillColor("#333")
        .text("Authorized By: __________________________");

      doc.end();

      stream.on("finish", resolve);
      stream.on("error", reject);

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generatePDF;
