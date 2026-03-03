const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "student", "teacher"],
    default: "student"
  },
  // For Primary Class Assignment (Primarily Students)
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class"
  },
  // Multi-assignment portfolio for Educators
  managedClassIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class"
  }],
  assignedSubjectIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject"
  }],
  academicYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AcademicYear"
  },
  avatar: {
    type: String, // URL to Cloudinary image
    default: ""
  },
  bio: {
    type: String,
    default: ""
  }
}, { timestamps: true });

// Indexes
userSchema.index({ role: 1, classId: 1 });

const User = mongoose.model("User", userSchema);
module.exports = User;