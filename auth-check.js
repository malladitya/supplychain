(function () {
  const AUTH_KEY = "nscns_auth";

  // Demo credentials for role-based access.
  const AUTH_USERS = {
    hq: {
      username: "hqadmin",
      password: "HQ@123",
      redirect: "hq.html",
      label: "National HQ Operator",
    },
    warehouse: {
      username: "warehousemgr",
      password: "WH@123",
      redirect: "warehouse.html",
      label: "Warehouse Manager",
    },
    driver: {
      username: "driver710",
      password: "DRV@123",
      redirect: "driver.html",
      label: "Fleet Driver",
    },
  };

  const PAGE_ROLE_MAP = {
    "hq.html": "hq",
    "warehouse.html": "warehouse",
    "driver.html": "driver",
  };

  function currentPageName() {
    const path = window.location.pathname || "";
    const page = path.split("/").pop();
    return page || "index.html";
  }

  function getStoredAuth() {
    try {
      const raw = window.sessionStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function setStoredAuth(payload) {
    window.sessionStorage.setItem(AUTH_KEY, JSON.stringify(payload));
  }

  function clearStoredAuth() {
    window.sessionStorage.removeItem(AUTH_KEY);
  }

  function validateCredentials(username, password, role) {
    const roleCfg = AUTH_USERS[role];
    if (!roleCfg) {
      return { ok: false, reason: "Invalid role selected." };
    }

    const normalizedUser = String(username || "").trim().toLowerCase();
    const expectedUser = roleCfg.username.toLowerCase();
    const expectedPass = roleCfg.password;

    if (normalizedUser !== expectedUser || String(password || "") !== expectedPass) {
      return { ok: false, reason: "Invalid username or password for selected role." };
    }

    return {
      ok: true,
      redirect: roleCfg.redirect,
      role,
      username: roleCfg.username,
      label: roleCfg.label,
    };
  }

  function ensureProtectedPageAccess() {
    const page = currentPageName();
    const requiredRole = PAGE_ROLE_MAP[page];
    if (!requiredRole) return;

    const auth = getStoredAuth();
    if (!auth || auth.role !== requiredRole) {
      clearStoredAuth();
      window.location.replace("index.html");
    }
  }

  window.NSCNS_AUTH_USERS = AUTH_USERS;
  window.getNSCNSUserSession = getStoredAuth;
  window.setNSCNSUserSession = setStoredAuth;
  window.validateNSCNSCredentials = validateCredentials;
  window.logout = function logout() {
    clearStoredAuth();
    window.location.href = "index.html";
  };

  ensureProtectedPageAccess();
})();
