// api.js
// Lightweight fetch wrapper with token handling
const Api = (function () {
  const base = ""; // empty -> same origin. If your API is at /api prefix in server, keep it empty.
  function getToken() {
    return localStorage.getItem("sq_token");
  }
  function setToken(t) {
    if (t) localStorage.setItem("sq_token", t);
    else localStorage.removeItem("sq_token");
  }

  async function request(path, opts = {}) {
    const headers = opts.headers || {};
    if (!headers["Content-Type"] && !(opts.body instanceof FormData))
      headers["Content-Type"] = "application/json";
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(base + path, Object.assign({}, opts, { headers }));
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      json = text;
    }
    if (!res.ok) {
      const err =
        json && json.message
          ? json.message
          : typeof json === "string"
          ? json
          : "Request failed";
      throw new Error(err);
    }
    return json;
  }

  return {
    setToken,
    getToken,
    login: (creds) =>
      request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(creds),
      }),
    register: (data) =>
      request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    me: () => request("/api/auth/me", { method: "GET" }).catch(() => null),

    // appointments
    listServices: () => request("/api/services", { method: "GET" }),
    listAppointments: () =>
      request("/api/appointments/mine", {
        method: "GET",
      }),
    // listAppointments: (query = "") =>
    //   request("/api/appointments" + (query ? "?" + query : ""), {
    //     method: "GET",
    //   }),
    createAppointment: (body) =>
      request("/api/appointments/book", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    cancelAppointment: (id) =>
      request(`/api/appointments/${id}/cancel`, { method: "POST" }),
    rescheduleAppointment: (id, data) =>
      request(`/api/appointments/reschedule/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    markServed: (id) =>
      request(`/api/appointments/served/${id}`, { method: "PUT" }),

    // admin
    listQueues: (service, date) =>
      request(`/api/queue?service=${service}&date=${date}`, { method: "GET" }),
    reorderQueue: (service, date, order) =>
      request(`/api/queue/reorder`, {
        method: "POST",
        body: JSON.stringify({ service, date, order }),
      }),
    getActivityLog: (filters = {}) =>
      request("/api/activity", {
        method: "POST",
        body: JSON.stringify(filters),
      }),

    // misc
    // getQR: (id) => request(`/api/appointments/${id}/qr`, { method: "GET" }),
  };
})();
