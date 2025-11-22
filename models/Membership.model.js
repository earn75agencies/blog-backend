const mongoose = require('mongoose');

/**
 * Membership Schema
 * For managing paid memberships and subscriptions
 */
const membershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'pending', 'suspended'],
      default: 'pending',
      index: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'lifetime'],
      default: 'monthly',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    features: {
      canPublishPosts: { type: Boolean, default: true },
      canCreateSeries: { type: Boolean, default: false },
      canCreateCourses: { type: Boolean, default: false },
      canSchedulePosts: { type: Boolean, default: false },
      canUseAnalytics: { type: Boolean, default: false },
      canCustomizeProfile: { type: Boolean, default: true },
      canRemoveAds: { type: Boolean, default: false },
      maxPostsPerMonth: { type: Number, default: 10 },
      maxStorageMB: { type: Number, default: 100 },
      maxSeriesCount: { type: Number, default: 0 },
      maxCoursesCount: { type: Number, default: 0 },
      prioritySupport: { type: Boolean, default: false },
      customDomain: { type: Boolean, default: false },
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    trialEndsAt: {
      type: Date,
    },
    isTrial: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
membershipSchema.index({ user: 1, status: 1 });
membershipSchema.index({ plan: 1, status: 1 });
membershipSchema.index({ status: 1, expiresAt: 1 });
membershipSchema.index({ expiresAt: 1 });
membershipSchema.index({ createdAt: -1 });

// Virtual for isActive
membershipSchema.virtual('isActive').get(function () {
  if (this.status !== 'active') return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
});

// Method to cancel membership
membershipSchema.methods.cancel = async function (reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.autoRenew = false;
  if (reason) {
    this.cancellationReason = reason;
  }
  await this.save();
  return this;
};

// Method to renew membership
membershipSchema.methods.renew = async function (expiresAt) {
  this.status = 'active';
  this.expiresAt = expiresAt;
  this.cancelledAt = null;
  this.cancellationReason = null;
  await this.save();
  return this;
};

// Pre-save middleware to set expiresAt based on billing cycle
membershipSchema.pre('save', function (next) {
  if (this.isModified('billingCycle') || this.isModified('startedAt')) {
    if (this.billingCycle === 'monthly') {
      this.expiresAt = new Date(this.startedAt);
      this.expiresAt.setMonth(this.expiresAt.getMonth() + 1);
    } else if (this.billingCycle === 'quarterly') {
      this.expiresAt = new Date(this.startedAt);
      this.expiresAt.setMonth(this.expiresAt.getMonth() + 3);
    } else if (this.billingCycle === 'yearly') {
      this.expiresAt = new Date(this.startedAt);
      this.expiresAt.setFullYear(this.expiresAt.getFullYear() + 1);
    } else if (this.billingCycle === 'lifetime') {
      this.expiresAt = null;
    }
  }
  next();
});

const Membership = mongoose.model('Membership', membershipSchema);

module.exports = Membership;

