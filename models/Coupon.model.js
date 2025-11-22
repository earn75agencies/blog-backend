const mongoose = require('mongoose');

/**
 * Coupon Schema
 * For discount coupons and promotional codes
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Coupon name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'free_shipping'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: [0, 'Value cannot be negative'],
    },
    minPurchase: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number,
    },
    applicableTo: {
      type: String,
      enum: ['all', 'products', 'courses', 'memberships', 'specific'],
      default: 'all',
    },
    applicableItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    usageLimitPerUser: {
      type: Number,
      default: 1,
    },
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        order: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order',
        },
        usageCount: {
          type: Number,
          default: 1,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    firstTimeOnly: {
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
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
couponSchema.index({ createdAt: -1 });

// Virtual for is valid
couponSchema.virtual('isValid').get(function () {
  const now = new Date();
  if (!this.isActive) return false;
  if (now < this.validFrom) return false;
  if (now > this.validUntil) return false;
  if (this.usageLimit && this.usageCount >= this.usageLimit) return false;
  return true;
});

// Method to validate coupon
couponSchema.methods.validateCoupon = async function (userId, orderAmount) {
  if (!this.isValid) {
    throw new Error('Coupon is not valid');
  }
  if (orderAmount < this.minPurchase) {
    throw new Error(`Minimum purchase of ${this.minPurchase} required`);
  }
  if (this.firstTimeOnly) {
    const hasUsedBefore = this.usedBy.some((u) => u.user.toString() === userId.toString());
    if (hasUsedBefore) {
      throw new Error('This coupon can only be used once');
    }
  }
  const userUsage = this.usedBy.find((u) => u.user.toString() === userId.toString());
  if (userUsage && userUsage.usageCount >= this.usageLimitPerUser) {
    throw new Error('You have reached the maximum usage limit for this coupon');
  }
  return true;
};

// Method to apply coupon
couponSchema.methods.apply = async function (userId, orderId, orderAmount) {
  await this.validateCoupon(userId, orderAmount);
  
  let discount = 0;
  if (this.type === 'percentage') {
    discount = (orderAmount * this.value) / 100;
    if (this.maxDiscount) {
      discount = Math.min(discount, this.maxDiscount);
    }
  } else if (this.type === 'fixed') {
    discount = this.value;
  } else if (this.type === 'free_shipping') {
    discount = 0; // Handle shipping separately
  }

  const existingUsage = this.usedBy.find((u) => u.user.toString() === userId.toString());
  if (existingUsage) {
    existingUsage.usageCount += 1;
  } else {
    this.usedBy.push({
      user: userId,
      order: orderId,
      usedAt: new Date(),
      usageCount: 1,
    });
  }
  this.usageCount += 1;
  await this.save();
  return discount;
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;

