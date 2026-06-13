const mongoose = require('mongoose');
const testTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: Number
});
module.exports = mongoose.model('TestType', testTypeSchema);
