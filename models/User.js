const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({

  // BASIC LOGIN INFO
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['patient', 'technician', 'admin'], 
    default: 'patient' 
  },

  // PROFILE COMPLETION CHECK
  profileCompleted: { type: Boolean, default: false },

  // PATIENT PROFILE DETAILS
  age: { type: Number },
  gender: { type: String },
  phone: { type: String },
  bloodGroup: { type: String },
  address: { type: String },

  medicalHistory: { type: String },
  allergies: { type: String },

  // PROFILE PHOTO (OPTIONAL)
  profilePhoto: { type: String }   // store filename or URL

}, { timestamps: true });


// PASSWORD HASHING
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
