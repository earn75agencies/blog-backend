const { asyncHandler } = require('../../../utils/asyncHandler');
const ErrorResponse = require('../../../utils/ErrorResponse');
const emailUtil = require('../../../utils/email.util');

/**
 * Send email notification
 */
exports.sendEmail = asyncHandler(async (req, res) => {
  const { to, subject, text, html, template, variables } = req.body;

  if (!to || !subject) {
    throw new ErrorResponse('Recipient email and subject are required', 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new ErrorResponse('Invalid email format', 400);
  }

  try {
    // If template is provided, render it with variables
    let emailHtml = html;
    let emailText = text;

    if (template) {
      // Simple template rendering (in production, use a template engine like Handlebars)
      if (variables) {
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          emailHtml = emailHtml?.replace(regex, variables[key]);
          emailText = emailText?.replace(regex, variables[key]);
        });
      }
    }

    await emailUtil.sendEmail({
      to,
      subject,
      text: emailText,
      html: emailHtml,
    });

    res.status(200).json({
      status: 'success',
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw new ErrorResponse(`Failed to send email: ${error.message}`, 500);
  }
});

/**
 * Send bulk email
 */
exports.sendBulkEmail = asyncHandler(async (req, res) => {
  const { recipients, subject, text, html, template, variables } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    throw new ErrorResponse('Recipients array is required', 400);
  }

  if (!subject) {
    throw new ErrorResponse('Subject is required', 400);
  }

  const results = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const recipient of recipients) {
    const email = typeof recipient === 'string' ? recipient : recipient.email;
    const recipientVariables = typeof recipient === 'object' ? { ...variables, ...recipient.variables } : variables;

    if (!email || !emailRegex.test(email)) {
      results.push({ email, status: 'failed', error: 'Invalid email format' });
      continue;
    }

    try {
      let emailHtml = html;
      let emailText = text;

      // Render template with variables
      if (template && recipientVariables) {
        Object.keys(recipientVariables).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          emailHtml = emailHtml?.replace(regex, recipientVariables[key]);
          emailText = emailText?.replace(regex, recipientVariables[key]);
        });
      }

      await emailUtil.sendEmail({
        to: email,
        subject,
        text: emailText,
        html: emailHtml,
      });

      results.push({ email, status: 'sent' });
    } catch (error) {
      results.push({ email, status: 'failed', error: error.message });
    }
  }

  const successCount = results.filter(r => r.status === 'sent').length;
  const failureCount = results.filter(r => r.status === 'failed').length;

  res.status(200).json({
    status: 'success',
    message: `Email sent to ${successCount} recipients. ${failureCount} failed.`,
    data: {
      total: recipients.length,
      sent: successCount,
      failed: failureCount,
      results,
    },
  });
});

/**
 * Send verification email
 */
exports.sendVerificationEmail = asyncHandler(async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    throw new ErrorResponse('Email and token are required', 400);
  }

  try {
    await emailUtil.sendVerificationEmail(email, token);
    
    res.status(200).json({
      status: 'success',
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    throw new ErrorResponse(`Failed to send verification email: ${error.message}`, 500);
  }
});

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = asyncHandler(async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    throw new ErrorResponse('Email and token are required', 400);
  }

  try {
    await emailUtil.sendPasswordResetEmail(email, token);
    
    res.status(200).json({
      status: 'success',
      message: 'Password reset email sent successfully',
    });
  } catch (error) {
    throw new ErrorResponse(`Failed to send password reset email: ${error.message}`, 500);
  }
});

