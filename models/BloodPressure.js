const mongoose = require("mongoose");

const BloodPressureSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  systolic: {
    type: Number,
    required: true
  },
  diastolic: {
    type: Number,
    required: true
  },
  note: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("BloodPressure", BloodPressureSchema);
