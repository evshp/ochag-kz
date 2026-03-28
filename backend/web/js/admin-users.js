// ===== ADMIN USERS PAGE =====
(function() {
  if (!AdminCommon.requireAuth()) return;

  var user = AdminCommon.getUser();
  document.getElementById('sidebarUser').textContent = user.username;
  var roleLabels = { admin: 'Администратор', manager: 'Менеджер', viewer: 'Просмотр' };
  document.getElementById('sidebarRole').textContent = roleLabels[user.role] || user.role;
  document.getElementById('logoutBtn').addEventListener('click', AdminCommon.logout);

  // Mobile sidebar toggle
  var toggleBtn = document.getElementById('sidebarToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      document.getElementById('adminSidebar').classList.toggle('open');
    });
  }

  // Hide add-user section for non-admins
  if (user.role !== 'admin') {
    document.getElementById('adminAddSection').style.display = 'none';
  }

  loadUsers();

  async function loadUsers() {
    try {
      var res = await AdminCommon.apiFetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load users');
      var users = await res.json();
      renderUsers(users);
    } catch(e) {
      console.error('Load users error:', e);
    }
  }

  function renderUsers(users) {
    var tbody = document.getElementById('adminUsersBody');
    var isAdmin = user.role === 'admin';

    tbody.innerHTML = '';
    users.forEach(function(u) {
      var roles = ['viewer', 'manager', 'admin'];
      var nextRole = roles[(roles.indexOf(u.role) + 1) % roles.length];
      var created = u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '\u2014';

      var tr = document.createElement('tr');

      var tdName = document.createElement('td');
      tdName.textContent = u.username;

      var tdRole = document.createElement('td');
      var badge = document.createElement('span');
      badge.className = 'role-badge role-' + u.role;
      badge.textContent = roleLabels[u.role] || u.role;
      tdRole.appendChild(badge);

      var tdDate = document.createElement('td');
      tdDate.textContent = created;

      var tdActions = document.createElement('td');
      if (isAdmin) {
        var btnRole = document.createElement('button');
        btnRole.className = 'admin-action-btn btn-edit';
        btnRole.textContent = 'Роль';
        btnRole.addEventListener('click', function() { changeRole(u.id, nextRole, u.username); });
        tdActions.appendChild(btnRole);

        if (u.username !== user.username) {
          var btnDel = document.createElement('button');
          btnDel.className = 'admin-action-btn btn-delete';
          btnDel.textContent = 'Удалить';
          btnDel.addEventListener('click', function() { deleteUser(u.id, u.username); });
          tdActions.appendChild(btnDel);
        }
      } else {
        tdActions.textContent = '\u2014';
      }

      tr.append(tdName, tdRole, tdDate, tdActions);
      tbody.appendChild(tr);
    });
  }

  document.getElementById('addUserBtn').addEventListener('click', async function() {
    if (user.role !== 'admin') return;
    var username = document.getElementById('newUsername').value.trim();
    var password = document.getElementById('newPassword').value;
    var role = document.getElementById('newRole').value;

    if (!username || !password) { alert('Заполните логин и пароль'); return; }
    if (username.length < 3) { alert('Логин должен быть не менее 3 символов'); return; }

    try {
      var res = await AdminCommon.apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username: username, password: password, role: role })
      });

      if (!res.ok) {
        var data = await res.json();
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
  });

  async function changeRole(userId, newRole, username) {
    if (user.role !== 'admin') return;
    if (!confirm('Изменить роль "' + username + '" на "' + roleLabels[newRole] + '"?')) return;

    try {
      var res = await AdminCommon.apiFetch('/api/admin/users/' + userId + '/role', {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        var data = await res.json();
        alert(data.error || 'Ошибка изменения роли');
        return;
      }
      loadUsers();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  }

  async function deleteUser(userId, username) {
    if (user.role !== 'admin') return;
    if (!confirm('Удалить пользователя "' + username + '"?')) return;

    try {
      var res = await AdminCommon.apiFetch('/api/admin/users/' + userId, { method: 'DELETE' });
      if (!res.ok) {
        var data = await res.json();
        alert(data.error || 'Ошибка удаления');
        return;
      }
      loadUsers();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  }
})();
