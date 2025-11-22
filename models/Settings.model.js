const mongoose = require('mongoose');

/**
 * Settings Schema
 */
const settingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: 'Gidi Blog',
      maxlength: [100, 'Site name cannot exceed 100 characters'],
    },
    siteDescription: {
      type: String,
      default: 'The ultimate international blogging platform',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    siteLogo: {
      type: String,
      default: null,
    },
    siteFavicon: {
      type: String,
      default: null,
    },
    defaultLanguage: {
      type: String,
      default: 'en',
    },
    supportedLanguages: [
      {
        type: String,
      },
    ],
    allowRegistration: {
      type: Boolean,
      default: true,
    },
    requireEmailVerification: {
      type: Boolean,
      default: true,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    moderateComments: {
      type: Boolean,
      default: false,
    },
    postsPerPage: {
      type: Number,
      default: 10,
      min: 1,
      max: 100,
    },
    enableAnalytics: {
      type: Boolean,
      default: true,
    },
    googleAnalyticsId: {
      type: String,
      default: null,
    },
    facebookPixelId: {
      type: String,
      default: null,
    },
    socialMedia: {
      facebook: { type: String, default: null },
      twitter: { type: String, default: null },
      instagram: { type: String, default: null },
      linkedin: { type: String, default: null },
      github: { type: String, default: null },
      youtube: { type: String, default: null },
    },
    seo: {
      metaTitle: { type: String, default: null },
      metaDescription: { type: String, default: null },
      metaKeywords: [String],
      ogImage: { type: String, default: null },
    },
    email: {
      fromName: { type: String, default: 'Gidi Blog' },
      fromEmail: { type: String, default: null },
      replyTo: { type: String, default: null },
    },
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: 'Site is under maintenance' },
    },
  },
  {
    timestamps: true,
  }
);

// Singleton pattern - only one settings document
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;

