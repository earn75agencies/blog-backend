const mongoose = require('mongoose');

/**
 * Custom Domain Schema
 * For custom domain management
 */
const domainSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verifying', 'active', 'failed', 'suspended'],
      default: 'pending',
      index: true,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verifiedAt: {
      type: Date,
    },
    sslEnabled: {
      type: Boolean,
      default: false,
    },
    sslCertificate: {
      type: String,
      select: false,
    },
    sslExpiresAt: {
      type: Date,
    },
    dnsRecords: [
      {
        type: {
          type: String,
          enum: ['A', 'AAAA', 'CNAME', 'TXT', 'MX'],
        },
        name: String,
        value: String,
        ttl: {
          type: Number,
          default: 3600,
        },
      },
    ],
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
domainSchema.index({ domain: 1 }, { unique: true });
domainSchema.index({ owner: 1, status: 1 });
domainSchema.index({ status: 1, createdAt: -1 });
domainSchema.index({ createdAt: -1 });

// Method to verify domain
domainSchema.methods.verify = async function () {
  this.status = 'verifying';
  await this.save();
  // Domain verification logic would go here
  return this;
};

const Domain = mongoose.model('Domain', domainSchema);

module.exports = Domain;

