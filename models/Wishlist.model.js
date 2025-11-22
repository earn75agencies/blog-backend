const mongoose = require('mongoose');

/**
 * Wishlist Schema
 * For user wishlists
 */
const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [
      {
        type: {
          type: String,
          enum: ['product', 'course', 'post', 'series'],
          required: true,
        },
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          maxlength: [500, 'Notes cannot exceed 500 characters'],
        },
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      default: 'My Wishlist',
      maxlength: [100, 'Wishlist name cannot exceed 100 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
wishlistSchema.index({ user: 1 }, { unique: true });
wishlistSchema.index({ 'items.itemId': 1, 'items.type': 1 });
wishlistSchema.index({ createdAt: -1 });

// Method to add item
wishlistSchema.methods.addItem = async function (type, itemId, notes) {
  const existingItem = this.items.find(
    (item) => item.type === type && item.itemId.toString() === itemId.toString()
  );
  if (!existingItem) {
    this.items.push({
      type,
      itemId,
      addedAt: new Date(),
      notes,
    });
    await this.save();
  }
  return this;
};

// Method to remove item
wishlistSchema.methods.removeItem = async function (type, itemId) {
  this.items = this.items.filter(
    (item) => !(item.type === type && item.itemId.toString() === itemId.toString())
  );
  await this.save();
  return this;
};

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;

