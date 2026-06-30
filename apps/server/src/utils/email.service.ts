import nodemailer from 'nodemailer';

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

export const sendVerificationEmail = async (email: string, otp: string): Promise<void> => {
  const transporter = getTransporter();
  const mailOptions = {
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email - Zira Chat',
    text: `Your verification code is:\n${otp}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #6366f1; text-align: center;">Verify Your Email</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 30px 0; color: #1e1b4b; background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (email: string, otp: string): Promise<void> => {
  const transporter = getTransporter();
  const mailOptions = {
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Password - Zira Chat',
    text: `Your password reset code is:\n${otp}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #6366f1; text-align: center;">Reset Your Password</h2>
        <p>Your password reset code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 30px 0; color: #1e1b4b; background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendAccountDeletionEmail = async (email: string, token: string): Promise<void> => {
  const transporter = getTransporter();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const confirmationLink = `${clientUrl}/confirm-delete?token=${token}`;

  const mailOptions = {
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Confirm Account Deletion - Zira Chat',
    text: `You have requested to permanently delete your Zira Chat account. Please confirm by clicking this link:\n${confirmationLink}\n\nThis link is valid for 15 minutes and can only be used once.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #ef4444; text-align: center;">Confirm Account Deletion</h2>
        <p>We received a request to permanently delete your Zira Chat account.</p>
        <p>Please note that this action is <strong>irreversible</strong>. All of your messages, media, call history, settings, and contacts will be permanently deleted.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmationLink}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Permanently Delete Account</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This link will expire in 15 minutes and can only be used once. If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
