// ===== ADMIN PANEL (JWT API) =====
(function() {
  let adminToken = null;
  let currentUser = null;

  async function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (adminToken) headers['Authorization'] = 'Bearer ' + adminToken;
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      adminToken = null;
      currentUser = null;
      showLogin();
      throw new Error('Сессия истекла');
    }
    return res;
  }

  window.openAdmin = function() {
    document.getElementById('adminOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    if (adminToken && currentUser) {
      showDashboard();
    } else {
      showLogin();
    }
  };

  window.closeAdmin = function() {
    document.getElementById('adminOverlay').classList.remove('active');
    document.body.style.overflow = '';
  };

  function showLogin() {
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('adminDashboard').classList.remove('active');
    document.getElementById('adminUsername').value = '';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminError').style.display = 'none';
  }

  function showDashboard() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').classList.add('active');
    document.getElementById('adminCurrentUser').textContent = currentUser.username;
    const roleLabels = { admin: 'Администратор', manager: 'Менеджер', viewer: 'Просмотр' };
    document.getElementById('adminCurrentRole').textContent = roleLabels[currentUser.role];
    document.getElementById('adminAddSection').style.display = currentUser.role === 'admin' ? 'block' : 'none';
    loadUsers();
  }

  async function loadUsers() {
    try {
      const res = await apiFetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      const users = await res.json();
      renderUsers(users);
    } catch(e) {
      console.error('Load users error:', e);
    }
  }

  function renderUsers(users) {
    const tbody = document.getElementById('adminUsersBody');
    const isAdmin = currentUser && currentUser.role === 'admin';
    const roleLabels = { admin: 'Администратор', manager: 'Менеджер', viewer: 'Просмотр' };

    tbody.innerHTML = '';
    users.forEach(u => {
      const roles = ['viewer', 'manager', 'admin'];
      const nextRole = roles[(roles.indexOf(u.role) + 1) % roles.length];
      const created = u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '\u2014';

      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.textContent = u.username;

      const tdRole = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'role-badge role-' + u.role;
      badge.textContent = roleLabels[u.role] || u.role;
      tdRole.appendChild(badge);

      const tdDate = document.createElement('td');
      tdDate.textContent = created;

      const tdActions = document.createElement('td');
      if (isAdmin) {
        const btnRole = document.createElement('button');
        btnRole.className = 'admin-action-btn btn-edit';
        btnRole.textContent = 'Роль';
        btnRole.addEventListener('click', () => changeRole(u.id, nextRole, u.username));
        tdActions.appendChild(btnRole);

        if (u.username !== currentUser.username) {
          const btnDel = document.createElement('button');
          btnDel.className = 'admin-action-btn btn-delete';
          btnDel.textContent = 'Удалить';
          btnDel.addEventListener('click', () => deleteUser(u.id, u.username));
          tdActions.appendChild(btnDel);
        }
      } else {
        tdActions.textContent = '\u2014';
      }

      tr.append(tdName, tdRole, tdDate, tdActions);
      tbody.appendChild(tr);
    });
  }

  window.adminAuth = async function() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errEl = document.getElementById('adminError');

    if (!username || !password) {
      errEl.textContent = 'Введите логин и пароль';
      errEl.style.display = 'block';
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const data = await res.json();
        errEl.textContent = data.error || 'Неверный логин или пароль';
        errEl.style.display = 'block';
        return;
      }

      const data = await res.json();
      adminToken = data.token;

      const payload = JSON.parse(atob(adminToken.split('.')[1]));
      currentUser = { id: payload.user_id, username: payload.username, role: payload.role };

      showDashboard();
    } catch(e) {
      errEl.textContent = 'Ошибка подключения к серверу';
      errEl.style.display = 'block';
    }
  };

  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('adminPassword').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') adminAuth();
    });
    document.getElementById('adminUsername').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') adminAuth();
    });
  });

  window.adminLogout = function() {
    adminToken = null;
    currentUser = null;
    showLogin();
  };

  window.addUser = async function() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;

    if (!username || !password) { alert('Заполните логин и пароль'); return; }
    if (username.length < 3) { alert('Логин должен быть не менее 3 символов'); return; }

    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, role })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Ошибка создания пользователя');
        return;
      }

      document.getElementById('newUsername').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('newRole').value = 'viewer';
      loadUsers();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  };

  window.changeRole = async function(userId, newRole, username) {
    if (!currentUser || currentUser.role !== 'admin') return;
    const roleLabels = { viewer: 'Просмотр', manager: 'Менеджер', admin: 'Администратор' };
    if (!confirm('Изменить роль "' + username + '" на "' + roleLabels[newRole] + '"?')) return;

    try {
      const res = await apiFetch('/api/admin/users/' + userId + '/role', {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Ошибка изменения роли');
        return;
      }
      loadUsers();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  };

  window.deleteUser = async function(userId, username) {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (!confirm('Удалить пользователя "' + username + '"?')) return;

    try {
      const res = await apiFetch('/api/admin/users/' + userId, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Ошибка удаления');
        return;
      }
      loadUsers();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  };

  // Auto-open admin panel on /admin URL
  if (window.location.pathname === '/admin') {
    openAdmin();
  }
})();
