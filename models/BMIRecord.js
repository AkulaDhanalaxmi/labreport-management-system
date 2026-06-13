const mongoose = require("mongoose");

const BMIRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  heightCm: { type: Number, required: true },
  weightKg: { type: Number, required: true },
  bmi: { type: Number, required: true },
  note: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("BMIRecord", BMIRecordSchema);
