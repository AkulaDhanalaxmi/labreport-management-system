const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const LabTest = require('../models/LabTest');
const User = require('../models/User');
const TestType = require('../models/TestType');

// Generate PDF for a lab test report (patient view)
// GET /patient/reports/:id/pdf
router.get('/patient/reports/:id/pdf', async (req, res) => {
  try {
    const id = req.params.id;
    const test = await LabTest.findById(id).populate('patient').populate('testType');
    if (!test) return res.status(404).send('Report not found');
    // Create reports directory
    const reportsDir = path.join(__dirname, '..', 'public', 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const filename = `report_${test._id}.pdf`;
    const filepath = path.join(reportsDir, filename);

    // Create PDF document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Header
    doc.image(path.join(__dirname, '..', 'public', 'assets', 'logo.png'), 40, 40, { width: 90 }).fillColor('#003b46').fontSize(20).text('Medora Lab Report', 140, 50);
    doc.moveDown(2);

    // Patient details
    doc.fontSize(12).fillColor('#000');
    doc.text(`Patient Name: ${test.patient ? test.patient.name : 'N/A'}`);
    doc.text(`Email: ${test.patient ? test.patient.email : 'N/A'}`);
    doc.text(`Test: ${test.testType ? test.testType.name : 'N/A'}`);
    doc.text(`Date: ${new Date(test.createdAt).toLocaleString()}`);
    doc.moveDown();

    // Results / summary
    doc.fontSize(14).fillColor('#0a74ff').text('Report Summary', { underline: true });
    doc.moveDown(0.5);
    const summary = test.result && test.result.summary ? test.result.summary : (test.summary || 'No summary provided.');
    doc.fontSize(12).fillColor('#000').text(summary, { align: 'left' });
    doc.moveDown();

    // If detailed key-value results exist, render table-like view
    if (test.result && typeof test.result === 'object' && Object.keys(test.result).length > 0) {
      doc.fontSize(12).fillColor('#0a74ff').text('Detailed Results', { underline: true });
      doc.moveDown(0.3);
      const keys = Object.keys(test.result).filter(k => k !== 'summary');
      keys.forEach(k => {
        doc.fillColor('#000').fontSize(11).text(`${k}: ${String(test.result[k])}`);
      });
      doc.moveDown();
    }

    // AI interpretation (if present)
    if (test.aiInterpretation) {
      doc.fillColor('#0a74ff').fontSize(12).text('AI Interpretation', { underline: true });
      doc.moveDown(0.3);
      doc.fillColor('#000').fontSize(11).text(test.aiInterpretation);
      doc.moveDown();
    }

    // Signature placeholder
    doc.moveDown(2);
    doc.text('__________________________', { continued: false });
    doc.text('Authorized Signature', { align: 'left' });

    doc.end();

    stream.on('finish', function() {
      // Send file for download
      res.download(filepath, filename, function(err){
        if (err) {
          console.error('Download error:', err);
          res.status(500).send('Could not download file');
        }
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error generating PDF');
  }
});

module.exports = router;
