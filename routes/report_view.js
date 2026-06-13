const express = require('express');
const router = express.Router();
const LabTest = require('../models/LabTest');

// Patient report view
router.get('/patient/reports/:id', async (req, res) => {
  try {
    const t = await LabTest.findById(req.params.id).populate('testType').populate('patient');
    if (!t) return res.status(404).send('Not found');
    res.render('patient/report-view', { test: t });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Simple AI analyzer - generate aiInterpretation based on numeric keys in result
router.post('/admin/analyze/:id', async (req, res) => {
  try {
    const t = await LabTest.findById(req.params.id);
    if (!t) return res.status(404).send('Not found');
    let interpretation = '';
    if (t.result && typeof t.result === 'object') {
      // simple rules
      if (t.result['Blood Sugar (Fasting)'] && Number(t.result['Blood Sugar (Fasting)']) > 125) {
        interpretation += 'Elevated fasting blood sugar detected. ';
      }
      if (t.result['Hemoglobin'] && Number(t.result['Hemoglobin']) < 12) {
        interpretation += 'Low hemoglobin (anemia) suspected. ';
      }
      if (!interpretation) interpretation = 'No obvious critical alerts from numeric values.';
    } else {
      interpretation = 'No numeric result to analyze.';
    }
    t.aiInterpretation = interpretation;
    await t.save();
    res.json({ ok:true, interpretation });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
