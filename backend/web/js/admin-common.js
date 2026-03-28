// ===== ADMIN COMMON: Auth, session, API helper =====
(function() {
  let adminToken = null;
  let currentUser = null;

  // Restore session from localStorage
  (function restoreSession() {
    try {
      const saved = localStorage.getItem('adminToken');
      if (!saved) return;
      const payload = JSON.parse(atob(saved.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('adminToken');
        return;
      }
      adminToken = saved;
      currentUser = { id: payload.user_id, username: payload.username, role: payload.role };
    } catch(e) {
      localStorage.removeItem('adminToken');
    }
  })();

  const categoryLabels = { bowl: 'Костровая чаша', table: 'Костровой стол', oven: 'Камин уличный', accessory: 'Аксессуар' };

  async function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (adminToken) headers['Authorization'] = 'Bearer ' + adminToken;
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      adminToken = null;
      currentUser = null;
      localStorage.removeItem('adminToken');
      window.location.href = '/admin';
      throw new Error('Сессия истекла');
    }
    return res;
  }

  function getToken() { return adminToken; }
  function getUser() { return currentUser; }
  function setSession(token) {
    adminToken = token;
    localStorage.setItem('adminToken', token);
    const payload = JSON.parse(atob(token.split('.')[1]));
    currentUser = { id: payload.user_id, username: payload.username, role: payload.role };
  }

  function logout() {
    adminToken = null;
    currentUser = null;
    localStorage.removeItem('adminToken');
    window.location.href = '/admin';
  }

  // Require auth — redirect to login if no token
  function requireAuth() {
    if (!adminToken || !currentUser) {
      window.location.href = '/admin';
      return false;
    }
    return true;
  }

  // Expose globally
  window.AdminCommon = {
    apiFetch,
    getToken,
    getUser,
    setSession,
    logout,
    requireAuth,
    categoryLabels
  };
})();
