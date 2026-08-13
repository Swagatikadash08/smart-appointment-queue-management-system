// utils/sendEmail.js
// Minimal email utility using nodemailer.
// Configure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in env.

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // use TLS if port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * sendEmail({ to, subject, text, html })
 * @returns {Promise}
 */
async function sendEmail({ to, subject, text, html }) {
  if (!to) throw new Error("sendEmail: 'to' required");
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const mailOptions = { from, to, subject, text, html };
  const info = await transporter.sendMail(mailOptions);
  return info;
}

module.exports = sendEmail;
