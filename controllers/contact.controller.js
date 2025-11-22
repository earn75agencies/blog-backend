const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const emailUtil = require('../utils/email.util');

/**
 * @desc    Send contact form message
 * @route   POST /api/contact
 * @access  Public
 */
exports.sendContactMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    throw new ErrorResponse('All fields are required', 400);
  }

  // Email validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    throw new ErrorResponse('Invalid email address', 400);
  }

  // Send email to admin
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@gidix.com';
  
  await emailUtil.sendEmail({
    to: adminEmail,
    subject: `Contact Form: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Contact Form Submission</h2>
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap; background-color: white; padding: 15px; border-radius: 3px;">${message}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px;">This message was sent from the Gidix contact form.</p>
      </div>
    `,
    text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This message was sent from the Gidix contact form.
    `,
  });

  // Send confirmation email to user
  await emailUtil.sendEmail({
    to: email,
    subject: 'We received your message - Gidix',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank you for contacting us!</h2>
        <p>Hi ${name},</p>
        <p>We've received your message and will get back to you as soon as possible.</p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Your message:</strong></p>
          <p style="white-space: pre-wrap; background-color: white; padding: 10px; border-radius: 3px;">${message}</p>
        </div>
        <p>Best regards,<br>The Gidix Team</p>
      </div>
    `,
    text: `
Thank you for contacting us!

Hi ${name},

We've received your message and will get back to you as soon as possible.

Your message:
${message}

Best regards,
The Gidix Team
    `,
  });

  res.status(200).json({
    status: 'success',
    message: 'Message sent successfully. We will get back to you soon!',
  });
});

