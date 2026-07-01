const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

console.log('Using credentials:');
console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '******' : 'undefined');

transporter.sendMail({
  from: `"Zira Chat Test" <${process.env.GMAIL_USER}>`,
  to: process.env.GMAIL_USER,
  subject: 'Test Email',
  text: 'Hello, this is a test email!',
}).then((info) => {
  console.log('Email sent successfully:', info);
  process.exit(0);
}).catch((err) => {
  console.error('Failed to send email:', err);
  process.exit(1);
});
