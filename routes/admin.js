const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const TestType = require('../models/TestType');
const LabTest = require('../models/LabTest');
const User = require('../models/User');
const Activity = require('../models/Activity');

/* =====================================================================
   LOGIN REDIRECT
===================================================================== */
router.get('/login', (req, res) => {
  return res.redirect('/login');
});

/* =====================================================================
   MULTER STORAGE
===================================================================== */
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, '..', 'public', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage: uploadStorage });

/* =====================================================================
   ADMIN AUTH
===================================================================== */
function ensureAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin')
    return res.redirect('/login');
  next();
}

/* =====================================================================
   REFERENCE RANGES
===================================================================== */
function getReferenceRange(param) {
  const p = param.toLowerCase();
  if (p.includes("hemoglobin")) return "12.0 – 16.0 g/dL";
  if (p.includes("rbc")) return "4.2 – 5.9 x10^12/L";
  if (p.includes("wbc")) return "4.0 – 11.0 x10^9/L";
  if (p.includes("platelet")) return "150 – 450 x10^9/L";
  if (p.includes("tsh")) return "0.4 – 4.0 mIU/L";
  if (p.includes("t3")) return "0.8 – 2.0 ng/dL";
  if (p.includes("t4")) return "5 – 12 µg/dL";
  if (p.includes("fasting")) return "< 100 mg/dL";
  if (p.includes("alt")) return "7 – 56 U/L";
  if (p.includes("ast")) return "10 – 40 U/L";
  if (p.includes("bilirubin")) return "0.1 – 1.2 mg/dL";
  return "-";
}

/* =====================================================================
   PDF GENERATOR
===================================================================== */
async function generateReportPDF(test, reportValues, summary, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.fontSize(22).fillColor("#0077ff").text("Medora Diagnostics", { align: "center" });
    doc.moveDown();
    doc.fontSize(11).fillColor("#000")
      .text(`Patient: ${test.patient.name}`)
      .text(`Email: ${test.patient.email}`)
      .text(`Test: ${test.testType.name}`)
      .text(`Booked At: ${new Date(test.bookedAt).toLocaleString()}`);

    if (test.scheduledAt)
      doc.text(`Scheduled At: ${new Date(test.scheduledAt).toLocaleString()}`);

    doc.moveDown();
    doc.fontSize(14).text("Test Values", { underline: true });
    doc.moveDown(0.5);

    Object.keys(reportValues).forEach(key => {
      const label = key.replace(/_/g, " ").toUpperCase();
      const value = reportValues[key];
      const range = getReferenceRange(label);

      doc.fontSize(10)
        .text(`${label}: ${value}   (Normal: ${range})`);
    });

    doc.moveDown();
    doc.fontSize(14).text("Summary / Notes", { underline: true });
    doc.fontSize(11).text(summary || "No summary added.");

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

/* =====================================================================
   DASHBOARD (day-wise revenue)
===================================================================== */
router.get('/dashboard', ensureAdmin, async (req, res) => {

  const pendingTestsCount = await LabTest.countDocuments({ status: "pending" });
  const pendingReportsCount = await LabTest.countDocuments({ status: "scheduled" });

  const pendingReports = await LabTest.find({ status: "scheduled" })
    .populate("patient")
    .populate("testType");

  const pendingTests = await LabTest.find({ status: "pending" })
    .populate("patient")
    .populate("testType");

  const completed = await LabTest.find({ status: "completed" })
    .populate("patient")
    .populate("testType");

  // TOTAL revenue
  let revenue = 0;
  completed.forEach(t => {
    if (t.testType?.price) revenue += t.testType.price;
  });

  // DAY WISE REVENUE
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let dailyRevenue = Array(daysInMonth).fill(0);

  completed.forEach(t => {
    if (t.reportGeneratedAt) {
      const d = new Date(t.reportGeneratedAt);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const index = d.getDate() - 1;
        if (t.testType?.price) dailyRevenue[index] += t.testType.price;
      }
    }
  });

  const stats = {
    tests: await LabTest.countDocuments(),
    completedTests: completed.length,
    patients: await User.countDocuments({ role: "patient" }),
    uploadedReports: completed.length
  };

  res.render("admin/dashboard", {
    pendingTestsCount,
    pendingReportsCount,
    pendingReports,
    pendingTests,
    stats,
    revenue,
    dailyRevenue,
    daysInMonth
  });
});

/* =====================================================================
   PENDING TESTS
===================================================================== */
router.get('/pending-tests', ensureAdmin, async (req, res) => {
  const tests = await LabTest.find({ status: 'pending' })
    .populate('patient')
    .populate('testType')
    .sort({ createdAt: -1 });

  res.render('admin/pending_tests', { tests });
});
router.get('/upload-report', ensureAdmin, async (req, res) => {
  const testId = req.query.testId;

  // If testId does not exist → redirect back
  if (!testId) return res.redirect('/admin/pending-reports');

  const test = await LabTest.findById(testId)
    .populate("patient")
    .populate("testType");

  if (!test) return res.redirect('/admin/pending-reports');

  res.render('admin/upload_report_single', { test });
});

// ADD NEW TEST TYPE
// ADD NEW TEST TYPE
router.post("/test-type/add", async (req, res) => {
  try {
    const { name, price } = req.body;

    await TestType.create({ name, price });

    req.session.message = "New Test Type Added Successfully!";
    res.redirect("back");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error adding test type");
  }
});
// DELETE TEST TYPE
router.get("/test-type/delete/:id", ensureAdmin, async (req, res) => {
  try {
    await TestType.findByIdAndDelete(req.params.id);

    req.session.message = "Test Type Deleted Successfully!";
    return res.redirect("back");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting test type");
  }
});
// UPDATE TEST TYPE
router.post("/test-type/update/:id", ensureAdmin, async (req, res) => {
  try {
    const { name, price } = req.body;

    await TestType.findByIdAndUpdate(req.params.id, {
      name,
      price
    });

    req.session.message = "Test Type Updated Successfully!";
    return res.redirect("back");

  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating test type");
  }
});




/* =====================================================================
   BILLING PAGE
===================================================================== */
router.get('/billing', ensureAdmin, async (req, res) => {
  const completed = await LabTest.find({ status: "completed" })
    .populate("patient")
    .populate("testType");

  res.render("admin/billing", { completed });
});

/* =====================================================================
   SCHEDULE TEST
===================================================================== */
router.post('/schedule/:id', ensureAdmin, async (req, res) => {
  const { scheduledAt } = req.body;
  await LabTest.findByIdAndUpdate(req.params.id, {
    scheduledAt,
    status: "scheduled"
  });

  res.json({ success: true });
});

/* =====================================================================
   PENDING REPORTS
===================================================================== */
router.get('/pending-reports', ensureAdmin, async (req, res) => {
  const scheduledTests = await LabTest.find({ status: 'scheduled' })
    .populate('patient')
    .populate('testType')
    .sort({ createdAt: -1 });

  res.render('admin/pending_reports', { scheduledTests });
});

/* =====================================================================
   UPLOAD REPORT (SINGLE)
===================================================================== */
router.get('/upload-report/:id', ensureAdmin, async (req, res) => {
  const test = await LabTest.findById(req.params.id)
    .populate("patient")
    .populate("testType");

  if (!test) return res.redirect("/admin/pending-reports");

  res.render("admin/upload_report_single", { test });
});

/* =====================================================================
   GENERATE REPORT
===================================================================== */
router.post('/generate-report', ensureAdmin, upload.single("extraFile"), async (req, res) => {
  const { testId, summary } = req.body;

  const test = await LabTest.findById(testId)
    .populate("patient")
    .populate("testType");

  if (!test) return res.redirect("/admin/pending-reports");

  let reportValues = {};
  Object.keys(req.body).forEach(key => {
    if (["testId", "summary"].includes(key)) return;
    if (req.body[key] !== "") {
      const num = Number(req.body[key]);
      reportValues[key] = isNaN(num) ? req.body[key] : num;
    }
  });

  const pdfName = `report_${testId}_${Date.now()}.pdf`;
  const pdfDir = path.join(__dirname, "..", "public", "reports");
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  const pdfPath = path.join(pdfDir, pdfName);

  await generateReportPDF(test, reportValues, summary, pdfPath);

  await LabTest.findByIdAndUpdate(testId, {
    reportFile: `reports/${pdfName}`,
    reportValues,
    summary,
    status: "completed",
    reportGeneratedAt: new Date()
  });

  res.redirect("/admin/pending-reports");
});

/* =====================================================================
   MANAGE TEST TYPES
===================================================================== */
router.get('/manage-test-types', ensureAdmin, async (req, res) => {
  const testTypes = await TestType.find().sort({ createdAt: -1 });
  res.render('admin/manage-test-types', { testTypes });
});

module.exports = router;
