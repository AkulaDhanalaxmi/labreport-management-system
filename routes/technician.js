const express = require('express');
const router = express.Router();
const LabTest = require('../models/LabTest');
const multer = require('multer');
const path = require('path');
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random()*1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + unique + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 10*1024*1024 } });
function ensureTech(req,res,next){
  if(!req.session.user || req.session.user.role!=='technician') return res.redirect('/login');
  next();
}
router.get('/dashboard', ensureTech, async (req,res) => {
  const tests = await LabTest.find().populate('patient testType');
  res.render('technician/dashboard', { tests });
});
router.post('/upload/:id', ensureTech, upload.single('report'), async (req,res) => {
  const file = req.file;
  if(!file){
    req.session.message = { type: 'danger', text: 'File upload failed' };
    return res.redirect('/technician/dashboard');
  }
  await LabTest.findByIdAndUpdate(req.params.id, { reportFile: file.filename, status: 'completed' });
  req.session.message = { type: 'success', text: 'Report uploaded' };
  res.redirect('/technician/dashboard');
});
module.exports = router;
