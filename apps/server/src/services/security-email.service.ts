import nodemailer from 'nodemailer';
import { IUser } from '../models/User';
import { ISession } from '../models/Session';
import { maskIpAddress } from '../utils/geo.utils';

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

const getBaseTemplate = (title: string, bodyContent: string, actionButton?: { text: string; url: string }) => {
  const buttonHtml = actionButton
    ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${actionButton.url}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">${actionButton.text}</a>
      </div>
    `
    : '';

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 25px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 24px; font-weight: 700;">Zira Chat Security</h1>
      </div>
      <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 600;">${title}</h2>
      ${bodyContent}
      ${buttonHtml}
      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 25px; font-size: 12px; color: #64748b; line-height: 1.5;">
        <p>If you did not initiate this action, please reset your password immediately and logout all devices through your Security Settings.</p>
        <p style="margin-top: 15px; text-align: center;">&copy; 2026 Zira Chat. All rights reserved.</p>
      </div>
    </div>
  `;
};

const formatDetails = (session: ISession) => {
  return `
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 14px; line-height: 1.6;">
      <strong>Device:</strong> ${session.deviceName}<br/>
      <strong>Browser:</strong> ${session.browser} (${session.browserVersion})<br/>
      <strong>Operating System:</strong> ${session.os}<br/>
      <strong>Location:</strong> ${session.city ? `${session.city}, ` : ''}${session.region ? `${session.region}, ` : ''}${session.country || 'Unknown'}<br/>
      <strong>IP Address:</strong> ${maskIpAddress(session.ipAddress)}<br/>
      <strong>Time:</strong> ${session.loginAt.toLocaleString()}
    </div>
  `;
};

export const sendLoginAlert = async (user: IUser, session: ISession): Promise<void> => {
  const transporter = getTransporter();
  const html = getBaseTemplate(
    'New Login Detected',
    `
      <p>Hello ${user.fullName || user.username},</p>
      <p>A new login was successfully recorded for your Zira Chat account.</p>
      ${formatDetails(session)}
    `
  );

  await transporter.sendMail({
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'Security Alert: New Login to Zira Chat',
    html,
  });
};

export const sendNewDeviceAlert = async (user: IUser, session: ISession): Promise<void> => {
  const transporter = getTransporter();
  const html = getBaseTemplate(
    'New Device Signed In',
    `
      <p>Hello ${user.fullName || user.username},</p>
      <p>Your Zira Chat account was signed into from a device we haven't seen before.</p>
      ${formatDetails(session)}
    `
  );

  await transporter.sendMail({
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'Security Alert: New Device Signed In',
    html,
  });
};

export const sendPasswordChangedAlert = async (user: IUser, session: ISession): Promise<void> => {
  const transporter = getTransporter();
  const html = getBaseTemplate(
    'Password Changed Successfully',
    `
      <p>Hello ${user.fullName || user.username},</p>
      <p>The password for your Zira Chat account was changed successfully.</p>
      ${formatDetails(session)}
    `
  );

  await transporter.sendMail({
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'Security Alert: Password Changed',
    html,
  });
};

export const sendRemoteLogoutAlert = async (user: IUser, session: ISession): Promise<void> => {
  const transporter = getTransporter();
  const html = getBaseTemplate(
    'Device Logged Out Remotely',
    `
      <p>Hello ${user.fullName || user.username},</p>
      <p>A device session was ended remotely from another device.</p>
      ${formatDetails(session)}
    `
  );

  await transporter.sendMail({
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'Security Alert: Session Ended Remotely',
    html,
  });
};

export const sendSessionRevokedAlert = async (user: IUser, session: ISession): Promise<void> => {
  const transporter = getTransporter();
  const html = getBaseTemplate(
    'Security Session Revoked',
    `
      <p>Hello ${user.fullName || user.username},</p>
      <p>An active session on your account was terminated for security reasons.</p>
      ${formatDetails(session)}
    `
  );

  await transporter.sendMail({
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'Security Alert: Session Revoked',
    html,
  });
};

export const sendSuspiciousLoginAlert = async (user: IUser, session: ISession, factors: string[]): Promise<void> => {
  const transporter = getTransporter();
  const factorsHtml = factors.map(f => `<li>${f}</li>`).join('');
  const html = getBaseTemplate(
    'Suspicious Login Blocked / Flagged',
    `
      <p>Hello ${user.fullName || user.username},</p>
      <p>We detected a highly unusual or suspicious login attempt on your account.</p>
      ${formatDetails(session)}
      <p><strong>Flagged Risk Factors:</strong></p>
      <ul>${factorsHtml}</ul>
    `
  );

  await transporter.sendMail({
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'CRITICAL Security Alert: Suspicious Login Attempt',
    html,
  });
};

export const sendTokenTheftAlert = async (user: IUser): Promise<void> => {
  const transporter = getTransporter();
  const html = getBaseTemplate(
    'CRITICAL: Session Hijacking Attempt Detected',
    `
      <p>Hello ${user.fullName || user.username},</p>
      <p style="color: #ef4444; font-weight: bold;">We have detected a session hijacking or token theft attempt on your Zira Chat account.</p>
      <p>Someone attempted to reuse an expired/rotated refresh session token. For your security, we have immediately:
        <ul>
          <li>Terminated all active device sessions on your account</li>
          <li>Forced a logout everywhere</li>
          <li>Disconnected all ongoing chat connections</li>
        </ul>
      </p>
      <p><strong>Please log back in immediately and reset your password.</strong></p>
    `
  );

  await transporter.sendMail({
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'URGENT: Session Theft Attempt Detected',
    html,
  });
};

export const sendLogoutAllAlert = async (user: IUser): Promise<void> => {
  const transporter = getTransporter();
  const html = getBaseTemplate(
    'Logged Out From All Devices',
    `
      <p>Hello ${user.fullName || user.username},</p>
      <p>You have successfully logged out of all active sessions and devices.</p>
    `
  );

  await transporter.sendMail({
    from: `"Zira Chat" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'Security Alert: Logged Out of All Devices',
    html,
  });
};
