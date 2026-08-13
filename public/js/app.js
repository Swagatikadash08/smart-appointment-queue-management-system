// app.js
let ALL_MY_APPOINTMENTS = [];
let allActivities = [];

function requireAuth() {
  const token = Api.getToken();
  if (!token) {
    window.location.replace("/index.html");
    return false;
  }
  return true;
}


const App = (function () {
  // utility
  function el(tag, attrs = {}, txt = "") {
    const node = document.createElement(tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (txt) node.textContent = txt;
    return node;
  }

  /* ---------- Dashboard ---------- */
  async function initDashboard() {
    if (!requireAuth()) return;

    await Auth.refreshMe().catch(() => null);
    SocketClient.connect();
    const user = Auth.getUser();
    document.getElementById("userLabel").textContent = user
      ? user.name || user.email
      : "Guest";

    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", Auth.logout);
    }

    // populate services & slots
    const svcSelect = document.getElementById("svc-select");
    const qSvc = document.getElementById("q-svc");
    const adminSvc = document.getElementById("admin-svc"); // might be undefined on dashboard page

    let services = [];
    try {
      const res = await Api.listServices();
      console.log("Services API response:", res);

      // backend returns { success, services }
      services = res.services || [];
    } catch (err) {
      console.error("Service API failed:", err);
    }

    svcSelect.innerHTML = '<option value="">Select Service</option>';
    qSvc.innerHTML = '<option value="">Select Service</option>';
    services.forEach((s) => {
      svcSelect.appendChild(el("option", { value: s._id }, s.name));
      qSvc.appendChild(el("option", { value: s._id }, s.name));
      if (adminSvc)
        adminSvc.appendChild(el("option", { value: s._id }, s.name));
    });

    populateServiceFilter(services);

    // slots
    const slotSelect = document.getElementById("slot-select");
    // const slots = [
    //   "09:00",
    //   "09:30",
    //   "10:00",
    //   "10:30",
    //   "11:00",
    //   "11:30",
    //   "14:00",
    //   "14:30",
    //   "15:00",
    //   "15:30",
    // ];
    // slotSelect.innerHTML = '<option value="">Select a time slot</option>';
    // slots.forEach((s) => {
    //   const opt = document.createElement("option");
    //   opt.value = s;
    //   opt.textContent = s;
    //   slotSelect.appendChild(opt);
    // });
    function generateSlots(avgMinutes) {
      const slots = [];
      let h = 9,
        m = 0;

      while (h < 16) {
        slots.push(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        );
        m += avgMinutes;
        if (m >= 60) {
          h++;
          m = m % 60;
        }
      }
      return slots;
    }

    async function refreshSlots() {
      slotSelect.innerHTML = '<option value="">Select a time slot</option>';

      const service = svcSelect.value;
      const date = dateInput.value;
      if (!service || !date) return;

      const serviceObj = services.find((s) => s._id === service);
      if (!serviceObj) return;

      const slots = generateSlots(serviceObj.avgHandleTime);

      const res = await Api.listQueues(service, date);
      const bookedSlots = (res.queue || []).map((a) => a.slot);

      slots.forEach((slot) => {
        const opt = document.createElement("option");
        opt.value = slot;
        opt.textContent = slot;

        // disable if booked OR in past
        if (bookedSlots.includes(slot) || isSlotInPast(date, slot)) {
          opt.disabled = true;
          opt.textContent += " (Unavailable)";
        }

        slotSelect.appendChild(opt);
      });
    }

    // set default dates
    const dateInput = document.getElementById("date");
    const qDate = document.getElementById("q-date");
    dateInput.value = qDate.value = new Date().toISOString().slice(0, 10);

    // ✅ Refresh live queue when service or date changes
    if (qSvc && qDate) {
      qSvc.addEventListener("change", refreshQueue);
      qDate.addEventListener("change", refreshQueue);
    }

    svcSelect.addEventListener("change", refreshSlots);
    dateInput.addEventListener("change", refreshSlots);

    // handlers
    document.getElementById("btn-book").addEventListener("click", async () => {
      try {
        const body = {
          name:
            document.getElementById("cust-name").value ||
            (user ? user.name : "Guest"),
          email:
            document.getElementById("cust-email").value ||
            (user ? user.email : ""),
          service: svcSelect.value,
          // branch: document.getElementById("branch-select").value,
          date: dateInput.value,
          slot: slotSelect.value,
        };
        const res = await Api.createAppointment(body);
        // ✅ UPDATE ETA BOX
        const etaEl = document.getElementById("book-eta");

        if (etaEl) {
          const queueRes = await Api.listQueues(
            svcSelect.value,
            dateInput.value
          );

          const sortedQueue = (queueRes.queue || []).sort(
            (a, b) => slotToMinutes(a.slot) - slotToMinutes(b.slot)
          );

          const index = sortedQueue.findIndex(
            (q) => q._id === res.appointment._id
          );

          const avgTime = sortedQueue[0]?.service?.avgHandleTime || 10;

          const eta = index >= 0 ? index * avgTime : 0;
          etaEl.textContent = `${eta} minutes`;
        }

        // const etaEl = document.getElementById("book-eta");
        // if (etaEl && res.appointment?.eta !== undefined) {
        //   etaEl.textContent = `${res.appointment.eta} minutes`;
        // }
        alert("Appointment booked successfully");
        // alert("Booked. Position: #" + (res.position || "—"));
        // emit to socket (server should also broadcast)
        SocketClient.emit("appointment:created", res);
        refreshMyAppointments();
        refreshQueue();
      } catch (err) {
        alert(err.message || "Booking failed");
      }
    });

    document.getElementById("btn-view-queue").addEventListener("click", () => {
      refreshQueue();
      window.scrollTo({ top: 600, behavior: "smooth" });
    });

    // listen to socket updates
    document.addEventListener("queue:updated", () => refreshQueue());
    document.addEventListener("appointment:served", () =>
      refreshMyAppointments()
    );
    document.addEventListener("appointment:cancelled", () =>
      refreshMyAppointments()
    );

    // 🔍 Appointment filters
    const filterDate = document.getElementById("filter-date");
    const filterStatus = document.getElementById("filter-status");
    const filterService = document.getElementById("filter-service");

    // ✅ Default filter = today
    if (filterDate) {
      filterDate.value = "today";
    }

    if (filterDate && filterStatus && filterService) {
      filterDate.addEventListener("change", applyAppointmentFilters);
      filterStatus.addEventListener("change", applyAppointmentFilters);
      filterService.addEventListener("change", applyAppointmentFilters);
    }

    // refresh views
    refreshMyAppointments();
    refreshQueue();
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function isAppointmentPast(a) {
    const apptTime = new Date(`${a.date}T${a.slot}:00`);
    return apptTime < new Date();
  }

  async function refreshMyAppointments() {
    const list = document.getElementById("my-list");
    if (!list) return;

    list.innerHTML = "";

    try {
      const res = await Api.listAppointments();
      ALL_MY_APPOINTMENTS = res.appointments || [];

      // ⏰ Auto-cancel past appointments
      for (const a of ALL_MY_APPOINTMENTS) {
        if (a.status === "queued" && isAppointmentPast(a)) {
          Api.cancelAppointment(a._id).catch(() => {});
          a.status = "cancelled";
        }
      }

      applyAppointmentFilters();
    } catch (e) {
      console.error(e);
      document.getElementById("my-list").innerHTML =
        '<div class="muted">Error loading</div>';
    }
  }

  function applyAppointmentFilters() {
    const dateFilter = document.getElementById("filter-date").value;
    const statusFilter = document.getElementById("filter-status").value;
    const serviceFilter = document.getElementById("filter-service").value;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = ALL_MY_APPOINTMENTS.filter((appt) => {
      const apptDate = new Date(appt.date);
      apptDate.setHours(0, 0, 0, 0);

      // 📅 Date filter
      if (dateFilter === "today" && apptDate.getTime() !== today.getTime())
        return false;

      if (dateFilter === "tomorrow") {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        if (apptDate.getTime() !== tomorrow.getTime()) return false;
      }

      if (dateFilter === "past" && apptDate >= today) return false;

      // 📌 Status filter
      const normalizedStatus =
        appt.status === "queued" ? "upcoming" : appt.status;

      if (statusFilter !== "all" && normalizedStatus !== statusFilter) {
        return false;
      }

      // 🛎 Service filter
      if (serviceFilter !== "all" && appt.service?.name !== serviceFilter)
        return false;

      return true;
    });

    renderMyAppointments(filtered);
  }

  function renderMyAppointments(appointments) {
    const list = document.getElementById("my-list");
    list.innerHTML = "";

    if (!appointments.length) {
      list.innerHTML = `<div class="muted small">No appointments</div>`;
      return;
    }

    appointments.forEach((a) => {
      const item = document.createElement("div");
      item.className = "appt-item";

      /* LEFT COLUMN */
      const left = document.createElement("div");
      left.className = "appt-left";
      left.innerHTML = `
      <div class="appt-name">${a.name}</div>
      <div class="appt-service">${a.service?.name || "Service"}</div>
      <div class="appt-datetime">${formatDate(a.date)} • ${a.slot}</div>
    `;

      /* RIGHT COLUMN */
      const right = document.createElement("div");
      right.className = "appt-right";

      /* TOP ACTIONS */
      const top = document.createElement("div");
      top.className = "appt-actions-top";

      if (a.status === "queued") {
        const resBtn = el(
          "button",
          { class: "btn btn-reschedule" },
          "Reschedule"
        );
        resBtn.onclick = () => openReschedule(a._id);

        const cancelBtn = el("button", { class: "btn btn-cancel" }, "Cancel");
        cancelBtn.onclick = async () => {
          if (!confirm("Cancel this appointment?")) return;
          await Api.cancelAppointment(a._id);
          refreshMyAppointments();
          refreshQueue();
        };

        top.append(resBtn, cancelBtn);
      }

      /* BOTTOM ACTIONS */
      const bottom = document.createElement("div");
      bottom.className = "appt-actions-bottom";

      const statusLabel = el(
        "span",
        { class: `appt-status ${a.status}` },
        a.status === "queued"
          ? "Upcoming"
          : a.status === "served"
          ? "Served"
          : "Cancelled"
      );

      bottom.appendChild(statusLabel);

      if (a.status === "queued" && a.checkInQR) {
        const qrBtn = el("button", { class: "btn btn-qr" }, "Show QR");
        qrBtn.onclick = () => {
          const w = window.open("", "QR");
          w.document.write(`
          <body style="background:#0A1828;display:flex;align-items:center;justify-content:center;height:100vh">
            <img src="${a.checkInQR}" style="background:#fff;padding:20px;border-radius:12px"/>
          </body>
        `);
        };
        bottom.appendChild(qrBtn);
      }

      right.append(top, bottom);
      item.append(left, right);
      list.appendChild(item);
    });
  }

  // async function refreshMyAppointments() {
  //   const user = Auth.getUser();
  //   const list = document.getElementById("my-list");
  //   if (!list) return;
  //   list.innerHTML = "";
  //   try {
  //     // const q = user ? `user=${user.id}` : "";
  //     const res = await Api.listAppointments().catch(() => null);
  //     const items = res?.appointments || [];
  //     if (!Array.isArray(items) || !items.length) {
  //       list.innerHTML = '<div class="muted">No appointments</div>';
  //       return;
  //     }
  //     // if (!items.length) {
  //     //   list.appendChild(el("div", {}, "No appointments"));
  //     //   return;
  //     // }
  //     items.forEach((a) => {
  //       // const row = el("div", { class: `item appt-${a.status}` });

  //       // const statusLabel =
  //       //   a.status === "served"
  //       //     ? "Served"
  //       //     : a.status === "cancelled"
  //       //     ? "Cancelled"
  //       //     : "Upcoming";

  //       const item = document.createElement("div");
  //       item.className = "appt-item";

  //       /* LEFT COLUMN */
  //       const left = document.createElement("div");
  //       left.className = "appt-left";

  //       left.append(
  //         el("div", { class: "appt-name" }, a.name),
  //         el("div", { class: "appt-service" }, a.service?.name || "Service"),
  //         el(
  //           "div",
  //           { class: "appt-datetime" },
  //           `${formatDate(a.date)} • ${a.slot}`
  //         )
  //       );

  //       // const left = el("div", { class: "appointment-info" });

  //       // const title = el("div", { class: "appointment-name" }, a.name);
  //       // const meta = el(
  //       //   "div",
  //       //   { class: "appointment-meta" },
  //       //   `${a.service?.name || "Service"} • ${a.date} • ${a.slot}`
  //       // );

  //       // left.appendChild(title);
  //       // left.appendChild(meta);

  //       // const badge = el("span", { class: "appt-status" }, statusLabel);
  //       // left.appendChild(badge);

  //       /* RIGHT COLUMN */
  //       const right = document.createElement("div");
  //       right.className = "appt-right";

  //       /* TOP RIGHT (buttons) */
  //       const topActions = document.createElement("div");
  //       topActions.className = "appt-actions-top";

  //       if (a.status === "queued") {
  //         topActions.append(rescheduleBtn, cancelBtn);
  //       }

  //       /* BOTTOM RIGHT (status + QR) */
  //       const bottomActions = document.createElement("div");
  //       bottomActions.className = "appt-actions-bottom";

  //       const statusBadge = el(
  //         "span",
  //         { class: `appt-status ${a.status}` },
  //         a.status === "queued"
  //           ? "Upcoming"
  //           : a.status === "served"
  //           ? "Served"
  //           : "Cancelled"
  //       );

  //       bottomActions.append(statusBadge);

  //       if (a.status === "queued") {
  //         bottomActions.append(qrBtn);
  //       }

  //       right.append(topActions, bottomActions);
  //       // const right = el("div", { class: "appointment-actions" });

  //       // if (a.status === "queued" && a._id) {
  //       //   const reschedule = el(
  //       //     "button",
  //       //     { class: "btn btn-reschedule" },
  //       //     "Reschedule"
  //       //   );

  //       //   reschedule.addEventListener("click", async () => {
  //       //     const newDate = prompt("Enter new date (YYYY-MM-DD):", a.date);
  //       //     if (!newDate) return;

  //       //     const newSlot = prompt("Enter new slot (HH:MM):", a.slot);
  //       //     if (!newSlot) return;

  //       //     try {
  //       //       await Api.rescheduleAppointment(a._id, {
  //       //         date: newDate,
  //       //         slot: newSlot,
  //       //       });

  //       //       alert("Appointment rescheduled successfully");
  //       //       refreshMyAppointments();
  //       //       refreshQueue();
  //       //     } catch (e) {
  //       //       alert("Failed to reschedule");
  //       //     }
  //       //   });

  //       //   const cancel = el("button", { class: "btn btn-cancel" }, "Cancel");

  //       //   cancel.addEventListener("click", async () => {
  //       //     if (!confirm("Cancel appointment?")) return;

  //       //     console.log("Cancelling appointment:", a._id); // debug safety

  //       //     await Api.cancelAppointment(a._id);
  //       //     SocketClient.emit("appointment:cancelled", { id: a._id });
  //       //     refreshMyAppointments();
  //       //     refreshQueue();
  //       //   });

  //       //   right.appendChild(reschedule);
  //       //   right.appendChild(cancel);
  //       // }

  //       if (a.status === "queued" && a.checkInQR) {
  //         const qr = el("button", { class: "btn btn-qr" }, "Show QR");

  //         qr.addEventListener("click", () => {
  //           const w = window.open("", "QR");
  //           w.document.writeln(`
  //     <html>
  //       <head>
  //         <title>Check-in QR</title>
  //         <style>
  //           body {
  //             background:#0A1828;
  //             display:flex;
  //             justify-content:center;
  //             align-items:center;
  //             height:100vh;
  //           }
  //           img {
  //             background:#fff;
  //             padding:20px;
  //             border-radius:12px;
  //           }
  //         </style>
  //       </head>
  //       <body>
  //         <img src="${a.checkInQR}" />
  //       </body>
  //     </html>
  //   `);
  //         });

  //         right.appendChild(qr);
  //       }

  //       // row.appendChild(left);
  //       // row.appendChild(right);
  //       // list.appendChild(row);
  //       item.append(left, right);
  //       list.appendChild(item);
  //     });
  //   } catch (e) {
  //     console.error(e);
  //     list.appendChild(el("div", {}, "Error loading"));
  //   }
  // }

  function populateServiceFilter(services) {
    const filterService = document.getElementById("filter-service");
    if (!filterService) return;

    filterService.innerHTML = `<option value="all">All Services</option>`;

    services.forEach((svc) => {
      const opt = document.createElement("option");
      opt.value = svc.name;
      opt.textContent = svc.name;
      filterService.appendChild(opt);
    });
  }

  function slotToMinutes(slot) {
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m;
  }

  function isSlotInPast(date, slot) {
    const now = new Date();
    const d = new Date(`${date}T${slot}:00`);
    return d < now;
  }

  async function refreshQueue() {
    const svc = document.getElementById("q-svc").value;
    const date = document.getElementById("q-date").value;
    const list = document.getElementById("queue-list");

    if (!svc || !date) {
      list.innerHTML = "<div class='muted'>Select service and date</div>";
      return;
    }

    list.innerHTML = "Loading...";

    try {
      const res = await Api.listQueues(svc, date);
      let items = res.queue || [];
      // ✅ SORT BY SLOT TIME (earliest first)
      items = items.sort((a, b) => {
        return slotToMinutes(a.slot) - slotToMinutes(b.slot);
      });

      if (!items.length) {
        list.innerHTML = "<div class='muted'>No one in queue</div>";
        return;
      }

      list.innerHTML = "";
      
      // get avgHandleTime safely
      const avgTime = items[0]?.service?.avgHandleTime || 10;

      items.forEach((a, i) => {
        const eta = i * avgTime;

        const row = document.createElement("div");
        row.className = "item";

        row.innerHTML = `
    <div>
      ${i + 1}. <strong>${a.name}</strong><br/>
      <span class="muted">
        ${a.service?.name || "Service"} • ${a.slot}
      </span>
    </div>
    <div class="badge">${eta} min</div>
  `;

        list.appendChild(row);
      });
    } catch (e) {
      console.error(e);
      list.innerHTML = "<div class='muted'>Failed to load queue</div>";
    }
  }

  // async function loadActivityServices() {
  //   const select = document.getElementById("activity-service");
  //   if (!select) return;

  //   // reset
  //   select.innerHTML = `<option value="all">All Services</option>`;

  //   const res = await Api.listServices(); // ✅ FIXED LINE
  //   const services = res.services || [];

  //   services.forEach((s) => {
  //     const opt = document.createElement("option");
  //     opt.value = s.name;
  //     opt.textContent = s.name;
  //     select.appendChild(opt);
  //   });
  // }

  /* ---------- Admin ---------- */
  async function initAdmin() {
    if (!requireAuth()) return;
    // 🔐 Ensure user info is fresh
    await Auth.refreshMe().catch(() => null);

    const user = Auth.getUser();

    // 🔐 Admin auth check
    if (!user || user.role !== "admin") {
      window.location.replace("/index.html");
      return;
    }

    // Show admin name
    const adminLabel = document.getElementById("adminLabel");
    if (adminLabel) {
      adminLabel.textContent = user.name || user.email;
    }

    try {
      SocketClient.connect();
    } catch (e) {
      console.warn("Socket connection skipped:", e.message);
    }

    // -------- LOAD SERVICES --------
    const svcSelect = document.getElementById("admin-svc");
    svcSelect.innerHTML = '<option value="">Select Service</option>';

    try {
      const res = await Api.listServices();
      const services = res.services || [];

      services.forEach((s) => {
        svcSelect.appendChild(el("option", { value: s._id }, s.name));
      });
    } catch (e) {
      console.error("Failed to load services", e);
    }

    // -------- DEFAULT DATE --------
    const todayInput = document.getElementById("admin-date");
    todayInput.value = new Date().toISOString().slice(0, 10);

    // -------- BUTTON HANDLERS --------
    document
      .getElementById("refresh-queues")
      .addEventListener("click", loadAdminQueues);

    document
      .getElementById("btn-logout-admin")
      .addEventListener("click", Auth.logout);

    // -------- SOCKET UPDATES --------
    document.addEventListener("queue:updated", loadAdminQueues);
    document.addEventListener("appointment:served", loadAdminQueues);
    document.addEventListener("appointment:cancelled", loadAdminQueues);

    // Initial load
    loadAdminQueues();
    loadActivityLog();
    // loadActivityServices();
    // 🔍 Activity log filters
    // ["activity-date", "activity-status", "activity-service"].forEach((id) => {
    //   const el = document.getElementById(id);
    //   if (el) el.addEventListener("change", applyActivityFilters);
    // });
  }

  async function loadAdminQueues() {
    const svc = document.getElementById("admin-svc").value;
    const date = document.getElementById("admin-date").value;
    const wrap = document.getElementById("admin-queues");
    wrap.innerHTML = "Loading...";
    try {
      const res = await Api.listQueues(svc, date);
      const items = res.queue || [];

      wrap.innerHTML = "";
      if (!items.length) {
        wrap.innerHTML = '<div class="muted">No items</div>';
        return;
      }
      items.forEach((a, idx) => {
        const row = el("div", { class: "item" });
        const left = el("div", {}, `${idx + 1}. ${a.name} — ${a.slot}`);
        const actions = el("div", { class: "admin-actions-row" });
        const serve = el("button", { class: "btn gold" }, "Serve");
        serve.addEventListener("click", async () => {
          await Api.markServed(a._id);
          SocketClient.emit("appointment:served", { id: a._id });
          loadAdminQueues();
        });
        const cancel = el("button", { class: "btn ghost" }, "Cancel");
        cancel.addEventListener("click", async () => {
          await Api.cancelAppointment(a._id);
          SocketClient.emit("appointment:cancelled", { id: a._id });
          loadAdminQueues();
        });
        actions.appendChild(serve);
        actions.appendChild(cancel);
        row.appendChild(left);
        row.appendChild(actions);
        wrap.appendChild(row);
      });
    } catch (e) {
      wrap.innerHTML = '<div class="muted">Error loading</div>';
    }
  }

  async function loadActivityLog() {
    const wrap = document.getElementById("activity-log");
    wrap.innerHTML = "Loading...";
    try {
      const res = await Api.getActivityLog({
        dateFilter: document.getElementById("activity-date")?.value || "today",
        status: document.getElementById("activity-status")?.value || "all",
        service: document.getElementById("activity-service")?.value || "all",
      });

      allActivities = res.logs || [];

      // applyActivityFilters();
      renderActivityLog(allActivities);
    } catch (e) {
      wrap.innerHTML = '<div class="muted">Error loading</div>';
    }
  }

  function renderActivityLog(logs) {
  const wrap = document.getElementById("activity-log");
  wrap.innerHTML = "";

  if (!logs.length) {
    wrap.innerHTML = `<div class="muted">No activity</div>`;
    return;
  }

  logs.forEach((it) => {
    let type = "info";
    if (it.message.toLowerCase().includes("served")) type = "served";
    else if (it.message.toLowerCase().includes("cancel")) type = "cancelled";
    else if (it.message.toLowerCase().includes("reschedule")) type = "rescheduled";

    const row = document.createElement("div");
    row.className = `activity-item ${type}`;
    row.innerHTML = `
      <span class="activity-time">
        ${new Date(it.ts).toLocaleString()}
      </span>
      <span class="activity-message">${it.message}</span>
    `;
    wrap.appendChild(row);
  });
}


  // function applyActivityFilters() {
  //   const wrap = document.getElementById("activity-log");
  //   wrap.innerHTML = "";

  //   const dateFilter =
  //     document.getElementById("activity-date")?.value || "today";
  //   const statusFilter =
  //     document.getElementById("activity-status")?.value || "all";
  //   const serviceFilter =
  //     document.getElementById("activity-service")?.value || "all";

  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);

  //   const filtered = allActivities.filter((it) => {
  //     const ts = new Date(it.ts);
  //     // const msg = it.message.toLowerCase();

  //     /* ---------- DATE FILTER ---------- */
  //     if (dateFilter === "today") {
  //       const d = new Date(ts);
  //       d.setHours(0, 0, 0, 0);
  //       if (d.getTime() !== today.getTime()) return false;
  //     }

  //     /* ---------- STATUS FILTER ---------- */
  //     // if (statusFilter !== "all") {
  //     //   if (!msg.includes(statusFilter.toLowerCase())) return false;
  //     // }

  //     // /* ---------- SERVICE FILTER ---------- */
  //     // if (serviceFilter !== "all") {
  //     //   if (!msg.includes(serviceFilter.toLowerCase())) return false;
  //     // }

  //     if (statusFilter !== "all") {
  //       if (!it.appointment || it.appointment.status !== statusFilter)
  //         return false;
  //     }

  //     if (serviceFilter !== "all") {
  //       if (!it.appointment || it.appointment.service?.name !== serviceFilter)
  //         return false;
  //     }

  //     return true;
  //   });

  //   if (!filtered.length) {
  //     wrap.innerHTML = `<div class="muted">No activity</div>`;
  //     return;
  //   }

  //   filtered.forEach((it) => {
  //     let type = "info";
  //     if (it.message.toLowerCase().includes("served")) type = "served";
  //     else if (it.message.toLowerCase().includes("cancel")) type = "cancelled";
  //     else if (it.message.toLowerCase().includes("reschedule"))
  //       type = "rescheduled";

  //     const row = document.createElement("div");
  //     row.className = `activity-item ${type}`;
  //     row.innerHTML = `
  //     <span class="activity-time">
  //       ${new Date(it.ts).toLocaleString()}
  //     </span>
  //     <span class="activity-message">${it.message}</span>
  //   `;
  //     wrap.appendChild(row);
  //   });
  // }

  return { initDashboard, initAdmin, refreshMyAppointments, refreshQueue };
})();

// ----------------------
// INDEX PAGE INITIALIZER
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page !== "index") return;

  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // Switch to Login Tab
  tabLogin.addEventListener("click", () => {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
  });

  // Switch to Register Tab
  tabRegister.addEventListener("click", () => {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
  });

  // Login Button
  document.getElementById("btn-login").addEventListener("click", async () => {
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-pass").value;

    try {
      const res = await Auth.login({ email, password: pass });

      // ✅ ROLE-BASED REDIRECT
      if (res.user?.role === "admin") {
        window.location.href = "/admin.html";
      } else {
        window.location.href = "/dashboard.html";
      }
    } catch (err) {
      alert(err.message || "Login failed");
    }
  });

  // Register Button
  document
    .getElementById("btn-register")
    .addEventListener("click", async () => {
      const name = document.getElementById("reg-name").value;
      const email = document.getElementById("reg-email").value;
      const pass = document.getElementById("reg-pass").value;

      try {
        await Auth.register({ name, email, password: pass });
        window.location.href = "/dashboard.html";
      } catch (err) {
        alert(err.message || "Registration failed");
      }
    });

  // Guest Login
  document.getElementById("guest-btn").addEventListener("click", () => {
    Auth.clear();
    window.location.href = "/dashboard.html";
  });
});

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, page:", document.body.dataset.page);

  if (document.body.dataset.page === "dashboard") {
    console.log("Initializing dashboard...");
    App.initDashboard();
  }
  if (document.body.dataset.page === "admin") {
    App.initAdmin();
  }
});
