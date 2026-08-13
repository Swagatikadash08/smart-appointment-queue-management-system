// auth.js
const Auth = (function () {
  async function login(creds) {
    const res = await Api.login(creds);
    if (res && res.token) {
      Api.setToken(res.token);
      localStorage.setItem("sq_user", JSON.stringify(res.user || null));
      return res;
    }
    throw new Error("Invalid login response");
  }

  async function register(payload) {
    const res = await Api.register(payload);
    if (res && res.token) {
      Api.setToken(res.token);
      localStorage.setItem("sq_user", JSON.stringify(res.user || null));
      return res;
    }
    throw new Error("Registration failed");
  }

  function logout() {
    Api.setToken(null);
    localStorage.removeItem("sq_user");

    // prevent back navigation
    window.location.replace("/index.html");
  }

  function clear() {
    Api.setToken(null);
    localStorage.removeItem("sq_user");
  }

  function getUser() {
    const u = localStorage.getItem("sq_user");
    return u ? JSON.parse(u) : null;
  }

  async function refreshMe() {
    const me = await Api.me();
    if (me && me.user) {
      localStorage.setItem("sq_user", JSON.stringify(me.user));
      return me.user;
    }
    return null;
  }

  return { login, register, logout, clear, getUser, refreshMe };
})();
