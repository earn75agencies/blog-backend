const mongoose = require('mongoose');

/**
 * Product Schema
 * For e-commerce products (books, merchandise, digital products)
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
    },
    compareAtPrice: {
      type: Number,
    },
    cost: {
      type: Number,
    },
    type: {
      type: String,
      enum: ['physical', 'digital', 'service', 'subscription'],
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    images: [String],
    featuredImage: {
      type: String,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'out_of_stock'],
      default: 'draft',
    },
    inventory: {
      trackInventory: {
        type: Boolean,
        default: false,
      },
      quantity: {
        type: Number,
        default: 0,
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
      },
    },
    shipping: {
      requiresShipping: {
        type: Boolean,
        default: false,
      },
      weight: {
        type: Number,
      },
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    seoTitle: {
      type: String,
      maxlength: [70, 'SEO title cannot exceed 70 characters'],
    },
    seoDescription: {
      type: String,
      maxlength: [160, 'SEO description cannot exceed 160 characters'],
    },
    seoKeywords: [String],
    salesCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        review: {
          type: String,
          maxlength: [1000, 'Review cannot exceed 1000 characters'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    // Variants & SKUs
    variants: [
      {
        name: String,
        sku: String,
        price: Number,
        compareAtPrice: Number,
        inventory: {
          quantity: Number,
          trackInventory: Boolean,
        },
        attributes: {
          type: Map,
          of: String,
        },
      },
    ],
    // Subcategories
    subcategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    // Discounts & Coupons
    discounts: [
      {
        code: String,
        type: {
          type: String,
          enum: ['percentage', 'fixed'],
        },
        value: Number,
        startDate: Date,
        endDate: Date,
        isActive: Boolean,
      },
    ],
    // Bundles
    bundleItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: Number,
      },
    ],
    isBundle: {
      type: Boolean,
      default: false,
    },
    // Digital downloads
    digitalFiles: [
      {
        name: String,
        url: String,
        size: Number,
        type: String,
        downloadLimit: Number,
        expiresAfter: Number, // days
      },
    ],
    // 3D/AR
    arModel: String,
    arModelUrl: String,
    videoDemo: String,
    // Recommendations
    recommendedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    // Visibility
    visibleRegions: [String],
    hiddenRegions: [String],
    // Expiration
    expiresAt: Date,
    // Analytics
    analytics: {
      conversionRate: { type: Number, default: 0 },
      addToCartCount: { type: Number, default: 0 },
      engagementScore: { type: Number, default: 0 },
      trendScore: { type: Number, default: 0 },
    },
    // Affiliate
    affiliateEnabled: {
      type: Boolean,
      default: false,
    },
    affiliateCommission: {
      type: Number,
      default: 0,
    },
    // Dropshipping
    isDropshipping: {
      type: Boolean,
      default: false,
    },
    supplier: {
      name: String,
      contact: String,
    },
    // NFT/Virtual
    isNFT: {
      type: Boolean,
      default: false,
    },
    nftData: {
      tokenId: String,
      contractAddress: String,
      blockchain: String,
    },
    // Licensing
    licenseType: {
      type: String,
      enum: ['standard', 'extended', 'commercial', 'exclusive'],
    },
    // Warehouses
    warehouses: [
      {
        name: String,
        location: String,
        quantity: Number,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true, sparse: true });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ type: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ views: -1 });
productSchema.index({ createdAt: -1 });

// Method to increment sales
productSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  if (this.inventory.trackInventory) {
    this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);
    if (this.inventory.quantity <= this.inventory.lowStockThreshold) {
      this.status = 'out_of_stock';
    }
  }
  await this.save();
  return this;
};

// Method to add rating
productSchema.methods.addRating = async function (userId, rating, review) {
  const existingRating = this.ratings.find((r) => r.user.toString() === userId.toString());
  if (existingRating) {
    existingRating.rating = rating;
    existingRating.review = review;
  } else {
    this.ratings.push({
      user: userId,
      rating,
      review,
    });
    this.ratingsCount += 1;
  }
  await this.calculateAverageRating();
  await this.save();
  return this;
};

// Method to calculate average rating
productSchema.methods.calculateAverageRating = async function () {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    return 0;
  }
  const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
  this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
  return this.averageRating;
};

// Method to increment views
productSchema.methods.incrementViews = async function () {
  this.views += 1;
  await this.save();
  return this;
};

// Pre-save middleware to generate slug
productSchema.pre('save', async function (next) {
  if (this.isModified('name') && !this.slug) {
    const slugify = require('../utils/string.util').slugify;
    let slug = slugify(this.name);
    let existingProduct = await mongoose.model('Product').findOne({ slug });
    let counter = 1;
    while (existingProduct) {
      slug = `${slugify(this.name)}-${counter}`;
      existingProduct = await mongoose.model('Product').findOne({ slug });
      counter++;
    }
    this.slug = slug;
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

