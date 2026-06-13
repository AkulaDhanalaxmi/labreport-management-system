// -----------------------------------------------------
// PATIENT ROUTES (FINAL CLEAN VERSION)
// -----------------------------------------------------

const express = require('express');
const router = express.Router();
const LabTest = require('../models/LabTest');
const TestType = require('../models/TestType');
const User = require('../models/User');
const HeartRate = require('../models/HeartRate');
const BMIRecord = require('../models/BMIRecord');
const BloodPressure = require('../models/BloodPressure');

const path = require("path");
const fs = require("fs");

// ----------------------------------------
// NORMAL RANGE FUNCTION
// ----------------------------------------
function getReferenceRange(param) {
  const p = param.toLowerCase();
  if (p.includes("hemoglobin")) return "12.0 – 16.0 g/dL";
  if (p.includes("rbc")) return "4.2 – 5.9 x10^12/L";
  if (p.includes("wbc")) return "4.0 – 11.0 x10^9/L";
  if (p.includes("platelet")) return "150 – 450 x10^9/L";
  if (p.includes("fasting")) return "< 100 mg/dL";
  if (p.includes("pp")) return "< 140 mg/dL";
  if (p.includes("tsh")) return "0.4 – 4.0 mIU/L";
  if (p.includes("t3")) return "80 – 200 ng/dL";
  if (p.includes("t4")) return "5 – 12 µg/dL";
  if (p.includes("alt")) return "7 – 56 U/L";
  if (p.includes("ast")) return "10 – 40 U/L";
  if (p.includes("bilirubin")) return "0.1 – 1.2 mg/dL";
  if (p.includes("creatinine")) return "0.6 – 1.3 mg/dL";
  if (p.includes("urea")) return "10 – 50 mg/dL";
  return "-";
}

// -----------------------------------------------------
// MIDDLEWARE
// -----------------------------------------------------
function ensurePatient(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'patient') {
    return res.redirect('/login');
  }
  next();
}

function ensureProfile(req, res, next) {
  next();
}

// -----------------------------------------------------
// DASHBOARD
function safeDate(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

router.get('/dashboard', ensurePatient, async (req, res) => {
  try {
    const patientId = req.session.user._id;

    const availableTests = await TestType.find().sort({ name: 1 });

    const tests = await LabTest.find({ patient: patientId })
      .populate('testType')
      .sort({ createdAt: -1 });

    const upcomingTests = tests.filter(t =>
      ["pending", "scheduled"].includes(t.status)
    );

    const upcomingCount = upcomingTests.length;
    const reportCount = tests.filter(t => t.status === "completed").length;

    const stats = { totalTests: tests.length };

    return res.render("patient/dashboard", {
      user: req.session.user,
      availableTests,
      tests,
      upcomingTests,
      upcomingCount,
      reportCount,
      stats,
      donutData: {
        labels: ["Pending", "Completed"],
        values: [upcomingCount, reportCount]
      },
      heartRates: [],
      bmiRecords: []
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard error");
  }
});
// GET /patient/profile


    // Build time series keyed by date string (YYYY-MM-DD)
  // -----------------------------------------------------
// PATIENT PROFILE PAGE (FINAL WORKING VERSION)
// -----------------------------------------------------
// -----------------------------------------------------
// PATIENT PROFILE PAGE (FINAL WORKING VERSION WITH SAFE DATES)
// -----------------------------------------------------
router.get('/profile', ensurePatient, async (req, res, next) => {
  try {
    const patientId = req.session.user._id;

    const tests = await LabTest.find({ patient: patientId })
      .populate('testType')
      .sort({ createdAt: 1 })
      .lean();

    const pendingTests = tests.filter(t => ["pending", "scheduled"].includes(t.status));
    const completedTests = tests.filter(t => t.status === "completed");

    const pendingCounts = {};
    pendingTests.forEach(t => {
      const name = t?.testType?.name || "Unknown";
      pendingCounts[name] = (pendingCounts[name] || 0) + 1;
    });

    function extractValue(t) {
      if (t.reportValues) {
        const firstKey = Object.keys(t.reportValues)[0];
        return Number(t.reportValues[firstKey]);
      }
      return null;
    }

    const byDate = {};
    completedTests.forEach(t => {
      const val = extractValue(t);

      const rawDate =
        t.completedAt ||
        t.updatedAt ||
        t.createdAt ||
        t.date ||
        t.time ||
        Date.now();

      const date = safeDate(rawDate).toISOString().slice(0, 10);

      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(val);
    });

    const timeSeries = Object.keys(byDate)
      .sort()
      .map(d => {
        const arr = byDate[d].filter(v => v !== null);
        const avg = arr.length
          ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
          : 60;

        return { date: d, score: avg };
      });

    const snapshotCounts = { healthy: 0, borderline: 0, abnormal: 0 };

    if (timeSeries.length) {
      const latest = timeSeries[timeSeries.length - 1];
      const latestTests = byDate[latest.date] || [];

      latestTests.forEach(v => {
        if (v >= 80) snapshotCounts.healthy++;
        else if (v >= 50) snapshotCounts.borderline++;
        else snapshotCounts.abnormal++;
      });
    }

    const heartRates = await HeartRate.find({ patient: patientId })
      .sort({ createdAt: 1 });

    const heartRateData = heartRates.map(h => ({
      date: safeDate(h.createdAt).toISOString().slice(0, 10),
      rate: h.value
    }));

    const bpRecords = await BloodPressure.find({ patient: patientId })
      .sort({ createdAt: 1 });

    const bpData = bpRecords.map(b => ({
      date: safeDate(b.createdAt).toISOString().slice(0, 10),
      systolic: Number(b.systolic),
      diastolic: Number(b.diastolic)
    }));

    const bmiRecords = await BMIRecord.find({ patient: patientId })
      .sort({ createdAt: 1 });

    const bmiData = bmiRecords.map(b => ({
      date: safeDate(b.createdAt).toISOString().slice(0, 10),
      bmi: b.value
    }));

    res.render("patient/profile", {
      user: req.session.user,
      pendingCountsJSON: JSON.stringify(pendingCounts),
      timeSeriesJSON: JSON.stringify(timeSeries),
      snapshotCountsJSON: JSON.stringify(snapshotCounts),
      heartRateJSON: JSON.stringify(heartRateData),
      bmiJSON: JSON.stringify(bmiData),
      bpJSON: JSON.stringify(bpData),   // ❤️ CORRECT FIX
      pendingCount: pendingTests.length,
      completedCount: completedTests.length,
      tests
    });

  } catch (err) {
    console.error("PROFILE ERROR:", err);
    next(err);
  }
});

// -----------------------------------------------------
router.get('/history', ensurePatient, async (req, res) => {
  const historyTests = await LabTest.find({
    patient: req.session.user._id,
    status: { $in: ["pending", "completed"] }
  })
    .populate('testType')
    .sort({ createdAt: -1 });

  historyTests.forEach(t => {

    // 🔥 Show pending label
    if (t.status === "pending" || t.status === "scheduled") {
      t.finalStatus = "pending";
      return;
    }

    // 🔥 Completed tests → evaluate values
    let finalStatus = "normal";

    if (t.reportValues) {
      Object.keys(t.reportValues).forEach(key => {
        const value = Number(t.reportValues[key]);
        const normal = getReferenceRange(key);

        if (normal.includes("–")) {
          let [low, high] = normal.split("–").map(v => parseFloat(v));

          if (value < low || value > high) finalStatus = "warning";
          if (value > high * 1.5) finalStatus = "serious";
        }
      });
    }

    t.finalStatus = finalStatus;
  });

  res.render('patient/history', { historyTests });
});

// -----------------------------------------------------
// REPORT SUMMARY
// -----------------------------------------------------
router.get('/report-summary/:id', ensurePatient, async (req, res) => {
  const test = await LabTest.findById(req.params.id).populate("testType");

  if (!test) return res.redirect("/patient/history");

  const reportValues = test.reportValues || {};
  let finalStatus = "normal";

  Object.keys(reportValues).forEach(key => {
    const value = Number(reportValues[key]);
    const normal = getReferenceRange(key);

    if (normal.includes("–")) {
      let [low, high] = normal.split("–").map(v => parseFloat(v));
      if (value < low || value > high) finalStatus = "warning";
      if (value > high * 1.5) finalStatus = "serious";
    }
  });

  res.render("patient/report_summary", {
    test,
    reportValues,
    finalStatus,
    getReferenceRange,
    user: req.session.user
  });
});

// -----------------------------------------------------
// VIEW REPORT
// -----------------------------------------------------
router.get('/report/:id', ensurePatient, (req, res) => {
  return res.redirect(`/patient/report-summary/${req.params.id}`);
});

// -----------------------------------------------------
// DOWNLOAD PDF
// -----------------------------------------------------
router.get('/report-download/:id', ensurePatient, async (req, res) => {
  const test = await LabTest.findById(req.params.id);

  if (!test || !test.reportFile) {
    return res.status(404).send("No PDF found");
  }

  const file = test.reportFile.split("/").pop();
  const filePath = path.join(__dirname, "..", "public", "reports", file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("PDF missing");
  }

  return res.download(filePath, file);
});

// -----------------------------------------------------
// BOOK TEST PAGE
// -----------------------------------------------------
router.get('/book', ensurePatient, async (req, res) => {
  const testTypes = await TestType.find();
  res.render("patient/book", {
    testTypes,
    preselect: "" 
  });
});

// -----------------------------------------------------
// BOOK CONFIRM
// -----------------------------------------------------
router.post('/book/confirm', ensurePatient, async (req, res) => {
  try {
    const { testType, date, time } = req.body;

    if (!testType || !date || !time) {
      return res.status(400).send("Missing details");
    }

    const type = await TestType.findById(testType);

    return res.render("patient/book_confirm", {
      date,
      time,
      testType: type,
      confirmImage: "/assets/confirm.jpg"
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Book confirm error");
  }
});

// -----------------------------------------------------
// BOOK CONFIRM SUBMIT
// -----------------------------------------------------
router.post('/book/confirm/submit', ensurePatient, async (req, res) => {
  const { testTypeId, date, time } = req.body;

  await LabTest.create({
    patient: req.session.user._id,
    testType: testTypeId,
    date,
    time,
    status: "pending"
  });

  res.redirect("/patient/history");
});

// -----------------------------------------------------
// REPORT LIST PAGE
// -----------------------------------------------------
router.get('/reports', ensurePatient, async (req, res) => {
  try {
    const reports = await LabTest.find({
      patient: req.session.user._id,
      status: "completed"
    })
      .populate("testType")
      .sort({ createdAt: -1 });

    res.render("patient/reports", { reports });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading reports");
  }
});

module.exports = router;
