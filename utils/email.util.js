const nodemailer = require('nodemailer');

/**
 * Email utility class
 */
class EmailUtil {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      console.warn('Email configuration not found. Email functionality will be disabled.');
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   */
  async sendEmail(options) {
    if (!this.transporter) {
      console.log('Email transporter not initialized. Skipping email send.');
      console.log('Email would be sent to:', options.to);
      console.log('Subject:', options.subject);
      return;
    }

    const mailOptions = {
      from: `"Gidix" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', options.to);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send verification email
   * @param {string} email - Recipient email
   * @param {string} token - Verification token
   */
  async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Gidix',
      text: `Please verify your email by clicking the following link: ${verificationUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Gidix!</h2>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #06b6d4; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      `,
    });
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} token - Reset token
   */
  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request - Gidix',
      text: `You requested a password reset. Click the following link to reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f44336; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
      `,
    });
  }

  /**
   * Send daily digest email
   * @param {string} email - Recipient email
   * @param {Object} data - Digest data (posts, recipientName, date)
   */
  async sendDailyDigest(email, data) {
    const { recipientName, posts, date } = data;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const postsHtml = posts.map(post => `
      <div style="margin: 20px 0; padding: 15px; border-left: 3px solid #06b6d4; background-color: #f9fafb;">
        <h3 style="margin: 0 0 10px 0;"><a href="${frontendUrl}/posts/${post.slug}" style="color: #06b6d4; text-decoration: none;">${post.title}</a></h3>
        <p style="margin: 0 0 10px 0; color: #6b7280;">${post.excerpt || post.title}</p>
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">By ${post.author?.username || 'Unknown'} • ${new Date(post.publishedAt).toLocaleDateString()}</p>
      </div>
    `).join('');

    await this.sendEmail({
      to: email,
      subject: `Daily Digest - ${date} - Gidix`,
      text: `Hello ${recipientName},\n\nHere are today's top posts:\n\n${posts.map(p => `- ${p.title}`).join('\n')}\n\nVisit ${frontendUrl} to read more.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Daily Digest - ${date}</h2>
          <p>Hello ${recipientName},</p>
          <p>Here are today's top posts from Gidix:</p>
          ${postsHtml}
          <div style="margin: 30px 0; text-align: center;">
            <a href="${frontendUrl}" style="display: inline-block; padding: 12px 24px; background-color: #06b6d4; color: white; text-decoration: none; border-radius: 4px;">Visit Gidix</a>
          </div>
          <p style="color: #9ca3af; font-size: 12px;">You're receiving this because you're subscribed to daily digests. <a href="${frontendUrl}/settings">Manage preferences</a></p>
        </div>
      `,
    });
  }

  /**
   * Send newsletter confirmation email
   * @param {string} email - Recipient email
   * @param {string} unsubscribeToken - Unsubscribe token
   */
  async sendNewsletterConfirmation(email, unsubscribeToken) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const unsubscribeUrl = `${frontendUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to Gidix Newsletter!',
      text: `Thank you for subscribing to our newsletter. You can unsubscribe at any time: ${unsubscribeUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Gidix Newsletter!</h2>
          <p>Thank you for subscribing to our newsletter. You'll receive the latest posts and updates delivered to your inbox.</p>
          <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}">unsubscribe here</a>.</p>
        </div>
      `,
    });
  }

  /**
   * Send newsletter email
   * @param {string} email - Recipient email
   * @param {string} subject - Email subject
   * @param {string} content - Email content (HTML)
   * @param {string} unsubscribeToken - Unsubscribe token
   */
  async sendNewsletter(email, subject, content, unsubscribeToken) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const unsubscribeUrl = `${frontendUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`;

    await this.sendEmail({
      to: email,
      subject: subject,
      text: content.replace(/<[^>]*>/g, ''),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${content}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            <a href="${unsubscribeUrl}" style="color: #9ca3af;">Unsubscribe from this newsletter</a>
          </p>
        </div>
      `,
    });
  }
}

module.exports = new EmailUtil();

