// utils/sendSMS.js
// Twilio SMS sender (requires TWILIO_SID, TWILIO_AUTH, TWILIO_PHONE in env)
const Twilio = require("twilio");

let client = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
  client = Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
}

/**
 * sendSMS({ to, body })
 */
async function sendSMS({ to, body }) {
  if (!client) throw new Error("Twilio client not configured (TWILIO_SID/TWILIO_AUTH)");
  if (!to) throw new Error("sendSMS: 'to' phone number required");
  if (!body) throw new Error("sendSMS: 'body' required");

  const from = process.env.TWILIO_PHONE;
  if (!from) throw new Error("sendSMS: TWILIO_PHONE not set");

  const msg = await client.messages.create({
    from,
    to,
    body
  });

  return msg;
}

module.exports = sendSMS;
