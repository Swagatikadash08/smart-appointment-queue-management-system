// sockets/queueSocket.js

const Appointment = require("../models/Appointment");

module.exports = function (io) {
  console.log("⚡ Socket.IO queue engine initialized");

  io.on("connection", async (socket) => {
    console.log("🟢 New socket connected:", socket.id);

    // User may be authenticated or anonymous
    const user = socket.user || null;

    // ─────────────────────────────────────
    // JOIN QUEUE ROOM
    // ─────────────────────────────────────
    socket.on("joinQueue", ({ branchId, serviceId }) => {
      const room = `${branchId}-${serviceId}`;
      socket.join(room);

      console.log(`📌 Socket ${socket.id} joined room: ${room}`);

      socket.emit("joinedRoom", { room });
    });

    // ─────────────────────────────────────
    // TRIGGER: NEW APPOINTMENT
    // ─────────────────────────────────────
    socket.on("appointmentCreated", async (data) => {
      const { branch, service, date } = data;

      const room = `${branch}-${service}`;

      const queue = await Appointment.find({
        branch,
        service,
        date,
        status: "queued"
      }).sort({ slot: 1 });

      io.to(room).emit("queueUpdated", queue);

      console.log("📣 Broadcast: queue updated for room:", room);
    });

    // ─────────────────────────────────────
    // TRIGGER: CANCEL APPOINTMENT
    // ─────────────────────────────────────
    socket.on("appointmentCancelled", async ({ branch, service, date }) => {
      const room = `${branch}-${service}`;

      const queue = await Appointment.find({
        branch,
        service,
        date,
        status: "queued"
      }).sort({ slot: 1 });

      io.to(room).emit("queueUpdated", queue);
    });

    // ─────────────────────────────────────
    // STAFF ACTION: SERVE NEXT CUSTOMER
    // ─────────────────────────────────────
    socket.on("serveNext", async ({ branch, service, date }) => {
      const room = `${branch}-${service}`;

      const next = await Appointment.findOne({
        branch,
        service,
        date,
        status: "queued"
      }).sort({ slot: 1 });

      if (!next) {
        io.to(room).emit("noMoreCustomers");
        return;
      }

      next.status = "served";
      await next.save();

      const updatedQueue = await Appointment.find({
        branch,
        service,
        date,
        status: "queued"
      }).sort({ slot: 1 });

      io.to(room).emit("queueUpdated", updatedQueue);
      io.to(room).emit("servedCustomer", next);
    });

    // ─────────────────────────────────────
    // ADMIN ACTION: REORDER QUEUE
    // ─────────────────────────────────────
    socket.on("queueReordered", async ({ branch, service, date }) => {
      const room = `${branch}-${service}`;

      const queue = await Appointment.find({
        branch,
        service,
        date,
        status: "queued"
      }).sort({ slot: 1 });

      io.to(room).emit("queueUpdated", queue);
    });

    // ─────────────────────────────────────
    // DISCONNECT EVENT
    // ─────────────────────────────────────
    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });
};
