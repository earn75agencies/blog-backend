const mongoose = require('mongoose');

/**
 * Course Enrollment Schema
 * For managing course enrollments with access control
 */
const courseEnrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    accessType: {
      type: String,
      enum: ['free', 'paid', 'subscription', 'invite', 'gift'],
      default: 'free',
    },
    payment: {
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
      },
      amount: Number,
      currency: String,
    },
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    // Gift enrollment
    giftedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Referral
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
courseEnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
courseEnrollmentSchema.index({ course: 1, enrolledAt: -1 });
courseEnrollmentSchema.index({ isActive: 1, expiresAt: 1 });

const CourseEnrollment = mongoose.model('CourseEnrollment', courseEnrollmentSchema);

module.exports = CourseEnrollment;

