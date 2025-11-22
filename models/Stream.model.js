const mongoose = require('mongoose');

/**
 * Live Stream Schema
 * For live streaming with chat and monetization
 */
const streamSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Stream title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    streamer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    streamKey: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    streamUrl: {
      type: String,
    },
    playbackUrl: {
      type: String,
    },
    thumbnail: {
      type: String,
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
    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    viewersCount: {
      type: Number,
      default: 0,
    },
    peakViewers: {
      type: Number,
      default: 0,
    },
    chat: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        message: {
          type: String,
          maxlength: [500, 'Message cannot exceed 500 characters'],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isModerator: {
          type: Boolean,
          default: false,
        },
      },
    ],
    donations: [
      {
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        amount: {
          type: Number,
          required: true,
        },
        currency: {
          type: String,
          default: 'USD',
        },
        message: {
          type: String,
          maxlength: [200, 'Message cannot exceed 200 characters'],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalDonations: {
      type: Number,
      default: 0,
    },
    scheduledStart: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    isMonetized: {
      type: Boolean,
      default: false,
    },
    recording: {
      url: String,
      duration: Number,
      fileSize: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
streamSchema.index({ streamKey: 1 }, { unique: true });
streamSchema.index({ streamer: 1, createdAt: -1 });
streamSchema.index({ status: 1, scheduledStart: 1 });
streamSchema.index({ status: 1, startedAt: -1 });
streamSchema.index({ viewersCount: -1 });
streamSchema.index({ createdAt: -1 });

// Method to start stream
streamSchema.methods.start = async function () {
  this.status = 'live';
  this.startedAt = new Date();
  await this.save();
  return this;
};

// Method to end stream
streamSchema.methods.end = async function () {
  this.status = 'ended';
  this.endedAt = new Date();
  if (this.startedAt) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  await this.save();
  return this;
};

// Method to add viewer
streamSchema.methods.addViewer = async function (userId) {
  const existingViewer = this.viewers.find(v => v.user.toString() === userId.toString());
  if (!existingViewer) {
    this.viewers.push({
      user: userId,
      joinedAt: new Date(),
    });
    this.viewersCount += 1;
    if (this.viewersCount > this.peakViewers) {
      this.peakViewers = this.viewersCount;
    }
    await this.save();
  }
  return this;
};

// Method to remove viewer
streamSchema.methods.removeViewer = async function (userId) {
  this.viewers = this.viewers.filter(v => v.user.toString() !== userId.toString());
  this.viewersCount = Math.max(0, this.viewersCount - 1);
  await this.save();
  return this;
};

// Method to add chat message
streamSchema.methods.addChatMessage = async function (userId, message, isModerator = false) {
  this.chat.push({
    user: userId,
    message,
    timestamp: new Date(),
    isModerator,
  });
  
  // Keep only last 1000 messages
  if (this.chat.length > 1000) {
    this.chat = this.chat.slice(-1000);
  }
  
  await this.save();
  return this;
};

// Method to add donation
streamSchema.methods.addDonation = async function (userId, amount, currency, message) {
  this.donations.push({
    from: userId,
    amount,
    currency,
    message,
    timestamp: new Date(),
  });
  this.totalDonations += amount;
  await this.save();
  return this;
};

// Pre-save middleware to generate stream key
streamSchema.pre('save', async function (next) {
  if (this.isNew && !this.streamKey) {
    const crypto = require('crypto');
    this.streamKey = crypto.randomBytes(32).toString('hex');
  }
  next();
});

const Stream = mongoose.model('Stream', streamSchema);

module.exports = Stream;

