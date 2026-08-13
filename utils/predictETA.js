// utils/predictETA.js
/**
 * Simple ETA predictor.
 *
 * Strategy:
 * 1. Load the Service.avgHandleTime as a fallback average (in minutes).
 * 2. Try to compute a moving average of actual handling times from recent 'served' appointments
 *    for the same service and branch (if servedAt is recorded).
 * 3. Count the number of queued appointments for the given service/branch/date.
 * 4. ETA = queued_count * effective_avg_handle_time.
 *
 * Notes:
 * - This is intentionally simple and robust (no external ML dependency).
 * - As you collect more data you can replace this with a model (e.g. regression model).
 */

const Appointment = require("../models/Appointment");
const Service = require("../models/Service");

async function predictETA(serviceId, branchId, date) {
  // Validate
  if (!serviceId) throw new Error("predictETA: serviceId required");

  // 1) Get per-service average time
  const svc = await Service.findById(serviceId).lean();
  const fallbackAvg = (svc && svc.avgHandleTime) ? Number(svc.avgHandleTime) : 10;

  // 2) Compute empirical avg from recent served appointments (if available)
  // We'll examine last N served appointments for this service+branch
  const N = 50;
  const recentServed = await Appointment.find({
    service: serviceId,
    branch: branchId,
    status: "served",
    servedAt: { $exists: true } // servedAt optional - controllers may set this
  })
    .sort({ servedAt: -1 })
    .limit(N)
    .select("createdAt servedAt")
    .lean();

  let empiricalAvg = null;
  if (recentServed && recentServed.length >= 3) {
    // compute durations in minutes
    const durations = recentServed
      .map(r => {
        const created = new Date(r.createdAt).getTime();
        const served = new Date(r.servedAt).getTime();
        if (!created || !served || served <= created) return null;
        return (served - created) / 60000.0;
      })
      .filter(Boolean);
    if (durations.length >= 3) {
      const sum = durations.reduce((s, v) => s + v, 0);
      empiricalAvg = sum / durations.length;
    }
  }

  const effectiveAvg = Math.round((empiricalAvg && empiricalAvg > 0 ? empiricalAvg : fallbackAvg) * 1); // minutes

  // 3) Count queued appointments BEFORE current time for date/service/branch
  // We count all queued appointments for same service+branch+date
  const queuedCount = await Appointment.countDocuments({
    service: serviceId,
    branch: branchId,
    date: date,
    status: "queued"
  });

  // ETA estimate (minutes) for a *new* booking (position at end)
  const etaMinutes = Math.max(0, queuedCount * effectiveAvg);

  return etaMinutes;
}

module.exports = predictETA;
