// utils/generateQR.js
// Generates a QR code data URI for a given text payload.
// Uses `qrcode` package (v1.5.1).
const QRCode = require("qrcode");

/**
 * generateQR(payload, options)
 * @param {string} payload - arbitrary string to encode (e.g. appointment id or check-in URL)
 * @param {object} options - optional QR options passed to qrcode.toDataURL
 * @returns {Promise<string>} Data URI (e.g. "data:image/png;base64,...")
 */
async function generateQR(payload, options = {}) {
  if (!payload) throw new Error("generateQR: payload required");
  // Default options: medium error correction, small margin for compact QR
  const opts = Object.assign({ errorCorrectionLevel: "M", margin: 1, scale: 6 }, options);
  const dataUri = await QRCode.toDataURL(String(payload), opts);
  return dataUri;
}

module.exports = generateQR;
