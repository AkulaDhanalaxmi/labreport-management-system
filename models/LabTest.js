const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({

  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testType: { type: mongoose.Schema.Types.ObjectId, ref: 'TestType', required: true },

  status: {
    type: String,
    enum: ["pending", "scheduled", "completed"],
    default: "pending"
  },

  bookedAt: { type: Date, default: Date.now },
  scheduledAt: { type: Date },

  // generated PDF file path
  reportFile: String,

  // auto-generated report data
  reportValues: { type: Object },
  summary: { type: String },

  // final interpretation from algorithm
  finalStatus: { type: String },

  reportGeneratedAt: { type: Date },

  notes: String

}, { timestamps: true });   // <-- 🔥 THIS FIXES INVALID DATE

module.exports = mongoose.model('LabTest', labTestSchema);
