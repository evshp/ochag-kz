// ===== ADMIN PANEL (JWT API) =====
(function() {
  let adminToken = null;
  let currentUser = null;
  let editingProductId = null;

  const categoryLabels = { bowl: 'Костровая чаша', table: 'Костровой стол', oven: 'Печь' };

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

    const canManage = currentUser.role === 'admin' || currentUser.role === 'manager';
    document.getElementById('productFormSection').style.display = canManage ? 'block' : 'none';

    loadUsers();
  }

  // ===== TAB SWITCHING =====
  window.switchTab = function(tabName) {
    document.querySelectorAll('.admin-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.admin-tab-content').forEach(el => {
      el.style.display = 'none';
    });
    const tabId = 'tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    document.getElementById(tabId).style.display = 'block';

    if (tabName === 'products') loadAdminProducts();
    if (tabName === 'stock') loadStock();
  };

  // ===== USERS =====
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

  // ===== PRODUCTS =====
  async function loadAdminProducts() {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      const products = await res.json();
      renderAdminProducts(products);
    } catch(e) {
      console.error('Load products error:', e);
    }
  }

  function renderAdminProducts(products) {
    const tbody = document.getElementById('adminProductsBody');
    const canManage = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');
    tbody.innerHTML = '';

    products.forEach(p => {
      const tr = document.createElement('tr');

      const tdId = document.createElement('td');
      tdId.textContent = p.id;

      const tdName = document.createElement('td');
      tdName.textContent = p.name;

      const tdCat = document.createElement('td');
      tdCat.textContent = categoryLabels[p.category] || p.category;

      const tdPrice = document.createElement('td');
      tdPrice.textContent = p.price.toLocaleString('ru-RU') + ' \u20B8';

      const tdBadge = document.createElement('td');
      tdBadge.textContent = p.badge || '\u2014';

      const tdActions = document.createElement('td');
      if (canManage) {
        const btnEdit = document.createElement('button');
        btnEdit.className = 'admin-action-btn btn-edit';
        btnEdit.textContent = 'Изменить';
        btnEdit.addEventListener('click', () => startEditProduct(p));
        tdActions.appendChild(btnEdit);

        const btnDel = document.createElement('button');
        btnDel.className = 'admin-action-btn btn-delete';
        btnDel.textContent = 'Удалить';
        btnDel.addEventListener('click', () => deleteProduct(p.id, p.name));
        tdActions.appendChild(btnDel);
      } else {
        tdActions.textContent = '\u2014';
      }

      tr.append(tdId, tdName, tdCat, tdPrice, tdBadge, tdActions);
      tbody.appendChild(tr);
    });
  }

  function startEditProduct(p) {
    editingProductId = p.id;
    document.getElementById('productFormTitle').textContent = 'Редактировать товар #' + p.id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productCategory').value = p.category;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productBadge').value = p.badge || '';
    document.getElementById('productImageUrl').value = p.image_url || '';
    document.getElementById('productSubmitBtn').textContent = 'Сохранить';
    document.getElementById('productCancelBtn').style.display = 'inline-block';
  }

  window.cancelEditProduct = function() {
    editingProductId = null;
    document.getElementById('productFormTitle').textContent = 'Добавить товар';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = 'bowl';
    document.getElementById('productPrice').value = '';
    document.getElementById('productBadge').value = '';
    document.getElementById('productImageUrl').value = '';
    document.getElementById('productSubmitBtn').textContent = 'Добавить';
    document.getElementById('productCancelBtn').style.display = 'none';
  };

  window.submitProduct = async function() {
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value, 10);
    const badge = document.getElementById('productBadge').value.trim();
    const image_url = document.getElementById('productImageUrl').value.trim();

    if (!name) { alert('Введите название товара'); return; }
    if (!price || price <= 0) { alert('Введите корректную цену'); return; }

    const body = { name, category, price, badge, image_url, specs: [], options: [] };

    try {
      let res;
      if (editingProductId) {
        res = await apiFetch('/api/admin/products/' + editingProductId, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      } else {
        res = await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Ошибка сохранения товара');
        return;
      }

      cancelEditProduct();
      loadAdminProducts();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  };

  async function deleteProduct(id, name) {
    if (!confirm('Удалить товар "' + name + '"?')) return;

    try {
      const res = await apiFetch('/api/admin/products/' + id, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Ошибка удаления');
        return;
      }
      loadAdminProducts();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  }

  // ===== STOCK =====
  async function loadStock() {
    try {
      const res = await apiFetch('/api/admin/inventory');
      if (!res.ok) throw new Error('Failed to load stock');
      const items = await res.json();
      renderStock(items);
    } catch(e) {
      console.error('Load stock error:', e);
    }
  }

  function renderStock(items) {
    const grid = document.getElementById('stockGrid');
    grid.innerHTML = '';

    items.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'sk-card';
      card.style.animationDelay = (i * 0.05) + 's';

      const statusClass = item.quantity > 0 ? 'sk-status--ok' : 'sk-status--empty';
      const statusText = item.quantity > 0 ? 'В наличии' : 'Нет в наличии';
      const catLabel = categoryLabels[item.category] || item.category;

      card.innerHTML =
        '<div class="sk-card-main">' +
          '<div class="sk-info">' +
            '<span class="sk-cat">' + catLabel + '</span>' +
            '<h4 class="sk-name">' + item.product_name + '</h4>' +
            '<span class="sk-status ' + statusClass + '">' + statusText + '</span>' +
          '</div>' +
          '<div class="sk-qty-block">' +
            '<button class="sk-btn sk-btn--minus" data-id="' + item.product_id + '" data-delta="-1">&minus;</button>' +
            '<span class="sk-qty ' + (item.quantity > 0 ? '' : 'sk-qty--zero') + '">' + item.quantity + '</span>' +
            '<button class="sk-btn sk-btn--plus" data-id="' + item.product_id + '" data-delta="1">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="sk-actions">' +
          '<button class="sk-link" data-action="adjust" data-id="' + item.product_id + '">Корректировка</button>' +
          '<button class="sk-link" data-action="logs" data-id="' + item.product_id + '" data-name="' + item.product_name + '">История</button>' +
        '</div>' +
        '<div class="sk-adjust" id="skAdjust_' + item.product_id + '">' +
          '<div class="sk-adjust-row">' +
            '<input type="number" class="sk-input" id="skDelta_' + item.product_id + '" placeholder="Кол-во (напр. 5 или -3)">' +
            '<input type="text" class="sk-input sk-input--reason" id="skReason_' + item.product_id + '" placeholder="Причина">' +
            '<button class="sk-submit" data-id="' + item.product_id + '">Применить</button>' +
            '<button class="sk-cancel" data-id="' + item.product_id + '">Отмена</button>' +
          '</div>' +
        '</div>' +
        '<div class="sk-logs" id="skLogs_' + item.product_id + '"></div>';

      grid.appendChild(card);
    });

    // Event delegation
    grid.addEventListener('click', function(e) {
      const btn = e.target.closest('[data-id]');
      if (!btn) return;
      const id = parseInt(btn.dataset.id, 10);

      if (btn.dataset.delta) {
        openAdjustWithDelta(id, parseInt(btn.dataset.delta, 10));
      } else if (btn.dataset.action === 'adjust') {
        toggleAdjustForm(id);
      } else if (btn.dataset.action === 'logs') {
        toggleLogs(id, btn.dataset.name);
      } else if (btn.classList.contains('sk-submit')) {
        submitAdjust(id);
      } else if (btn.classList.contains('sk-cancel')) {
        toggleAdjustForm(id, true);
      }
    });
  }

  function toggleAdjustForm(productId, forceClose) {
    const el = document.getElementById('skAdjust_' + productId);
    if (!el) return;
    const isOpen = el.classList.contains('sk-adjust--open');
    // Close all open forms
    document.querySelectorAll('.sk-adjust--open').forEach(f => f.classList.remove('sk-adjust--open'));
    if (!isOpen && !forceClose) {
      el.classList.add('sk-adjust--open');
      el.querySelector('.sk-input').focus();
    }
  }

  function openAdjustWithDelta(productId, delta) {
    const el = document.getElementById('skAdjust_' + productId);
    if (!el) return;
    document.querySelectorAll('.sk-adjust--open').forEach(f => f.classList.remove('sk-adjust--open'));
    el.classList.add('sk-adjust--open');
    const deltaEl = document.getElementById('skDelta_' + productId);
    const reasonEl = document.getElementById('skReason_' + productId);
    deltaEl.value = delta;
    reasonEl.value = delta > 0 ? 'Поступление' : 'Списание';
    reasonEl.focus();
  }

  async function submitAdjust(productId) {
    const deltaEl = document.getElementById('skDelta_' + productId);
    const reasonEl = document.getElementById('skReason_' + productId);
    const delta = parseInt(deltaEl.value, 10);
    if (isNaN(delta) || delta === 0) { deltaEl.focus(); return; }
    const reason = reasonEl.value.trim() || (delta > 0 ? 'Поступление' : 'Списание');

    try {
      const res = await apiFetch('/api/admin/inventory/' + productId, {
        method: 'PUT',
        body: JSON.stringify({ delta, reason })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Ошибка');
        return;
      }
      loadStock();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  }

  async function adjustStock(productId, delta) {
    const reason = delta > 0 ? 'Поступление' : 'Списание';
    try {
      const res = await apiFetch('/api/admin/inventory/' + productId, {
        method: 'PUT',
        body: JSON.stringify({ delta, reason })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Ошибка изменения остатка');
        return;
      }
      loadStock();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  }

  async function toggleLogs(productId, productName) {
    const el = document.getElementById('skLogs_' + productId);
    if (!el) return;
    if (el.classList.contains('sk-logs--open')) {
      el.classList.remove('sk-logs--open');
      return;
    }
    // Close other open logs
    document.querySelectorAll('.sk-logs--open').forEach(f => f.classList.remove('sk-logs--open'));

    el.innerHTML = '<div class="sk-logs-loading">Загрузка...</div>';
    el.classList.add('sk-logs--open');

    try {
      const res = await apiFetch('/api/admin/inventory/' + productId + '/logs');
      if (!res.ok) throw new Error('err');
      const logs = await res.json();
      renderLogsInline(el, logs, productName);
    } catch(e) {
      el.innerHTML = '<div class="sk-logs-empty">Ошибка загрузки</div>';
    }
  }

  function renderLogsInline(container, logs, productName) {
    if (!logs || logs.length === 0) {
      container.innerHTML = '<div class="sk-logs-empty">Нет записей</div>';
      return;
    }

    let html = '<div class="sk-logs-title">История: ' + productName + '</div><div class="sk-logs-list">';
    logs.forEach(l => {
      const date = new Date(l.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const cls = l.delta > 0 ? 'sk-log-plus' : 'sk-log-minus';
      const sign = l.delta > 0 ? '+' : '';
      html += '<div class="sk-log-row">' +
        '<span class="sk-log-date">' + date + '</span>' +
        '<span class="sk-log-delta ' + cls + '">' + sign + l.delta + '</span>' +
        '<span class="sk-log-reason">' + (l.reason || '\u2014') + '</span>' +
      '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // Auto-open admin panel on /admin URL
  if (window.location.pathname === '/admin') {
    openAdmin();
  }
})();
