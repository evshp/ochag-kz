// ===== ADMIN PANEL (JWT API) =====
(function() {
  let adminToken = null;
  let currentUser = null;
  let editingProductId = null;

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

  const categoryLabels = { bowl: 'Костровая чаша', table: 'Костровой стол', oven: 'Печь', accessory: 'Аксессуар' };

  async function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (adminToken) headers['Authorization'] = 'Bearer ' + adminToken;
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      adminToken = null;
      currentUser = null;
      localStorage.removeItem('adminToken');
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
      localStorage.setItem('adminToken', adminToken);

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
    localStorage.removeItem('adminToken');
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

  // ===== PRODUCTS (redesigned with search, filters, cards) =====
  let allAdminProducts = [];
  let activeProductFilter = 'all';

  async function loadAdminProducts() {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      allAdminProducts = await res.json();
      filterProducts();
    } catch(e) {
      console.error('Load products error:', e);
    }
  }

  window.filterProducts = function() {
    const query = (document.getElementById('productSearch').value || '').toLowerCase().trim();
    const sort = document.getElementById('productSort').value;

    let filtered = allAdminProducts.filter(p => {
      const matchesFilter = activeProductFilter === 'all' || p.category === activeProductFilter;
      const matchesSearch = !query || p.name.toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query) ||
        (categoryLabels[p.category] || '').toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'ru');
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'category') return (a.category || '').localeCompare(b.category || '');
      return 0;
    });

    // Update count
    const countEl = document.getElementById('productSearchCount');
    if (query || activeProductFilter !== 'all') {
      countEl.textContent = filtered.length + ' из ' + allAdminProducts.length;
    } else {
      countEl.textContent = '';
    }

    renderAdminProducts(filtered);
  };

  window.setProductFilter = function(filter) {
    activeProductFilter = filter;
    document.querySelectorAll('#productFilters .ap-chip').forEach(btn => {
      btn.classList.toggle('ap-chip--active', btn.dataset.filter === filter);
    });
    filterProducts();
  };

  function renderAdminProducts(products) {
    const grid = document.getElementById('adminProductsGrid');
    const emptyEl = document.getElementById('adminProductsEmpty');
    const canManage = currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager');

    if (products.length === 0) {
      grid.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }
    grid.style.display = '';
    emptyEl.style.display = 'none';
    grid.innerHTML = '';

    products.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'ap-card';
      card.style.animationDelay = (i * 0.04) + 's';

      const catLabel = categoryLabels[p.category] || p.category;
      const priceStr = p.price.toLocaleString('ru-RU') + ' \u20B8';
      const recCount = (p.recommendations || []).length;

      // Image
      let imgHtml;
      if (p.image_url) {
        imgHtml = '<img class="ap-card-img" src="' + p.image_url + '" alt="' + p.name + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="ap-card-img--placeholder" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
      } else {
        imgHtml = '<div class="ap-card-img--placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
      }

      let badgeHtml = p.badge ? '<span class="ap-card-badge">' + p.badge + '</span>' : '';
      let descHtml = p.description ? '<div class="ap-card-desc">' + p.description + '</div>' : '';

      // Show specs inline on card
      const specsCount = (p.specs || []).length;
      const optionsCount = (p.options || []).length;
      let specsHtml = '';
      if (specsCount > 0) {
        specsHtml = '<div class="ap-card-specs">';
        (p.specs || []).slice(0, 3).forEach(s => {
          specsHtml += '<span class="ap-card-spec">' + s.label + ': <strong>' + s.value + '</strong></span>';
        });
        if (specsCount > 3) specsHtml += '<span class="ap-card-spec ap-card-spec--more">+' + (specsCount - 3) + '</span>';
        specsHtml += '</div>';
      }

      let actionsHtml = '';
      if (canManage) {
        actionsHtml = '<div class="ap-card-actions">' +
          '<button class="ap-card-action ap-card-action--edit" data-action="edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Изменить</button>' +
          '<button class="ap-card-action ap-card-action--rec" data-action="rec"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>Рекоменд.' +
          (recCount > 0 ? ' <span class="ap-card-rec-count"><strong>' + recCount + '</strong></span>' : '') +
          '</button>' +
          '<button class="ap-card-action ap-card-action--del" data-action="del"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>Удалить</button>' +
        '</div>';
      }

      card.innerHTML = imgHtml +
        '<div class="ap-card-body">' +
          '<div class="ap-card-cat">' + catLabel + '</div>' +
          '<div class="ap-card-name">' + p.name + '</div>' +
          descHtml +
          specsHtml +
          '<div class="ap-card-meta">' +
            '<span class="ap-card-price">' + priceStr + '</span>' +
            badgeHtml +
          '</div>' +
          (optionsCount > 0 ? '<div class="ap-card-opts-info">' + optionsCount + ' опци' + (optionsCount === 1 ? 'я' : optionsCount < 5 ? 'и' : 'й') + '</div>' : '') +
        '</div>' +
        actionsHtml;

      // Event delegation for card actions
      card.addEventListener('click', function(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        const action = actionBtn.dataset.action;
        if (action === 'edit') startEditProduct(p);
        else if (action === 'rec') openRecommendations(p.id, p.name);
        else if (action === 'del') deleteProduct(p.id, p.name);
      });

      grid.appendChild(card);
    });
  }

  // Collapsible product form
  window.toggleProductForm = function() {
    const panel = document.getElementById('productFormSection');
    panel.classList.toggle('ap-form--open');
  };

  // ===== DYNAMIC SPEC ROWS =====
  window.addSpecRow = function(label, value) {
    const container = document.getElementById('specsContainer');
    const row = document.createElement('div');
    row.className = 'ap-dynrow';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'ap-input';
    labelInput.placeholder = 'Название (напр. Размер, Сталь, Вес)';
    labelInput.value = label || '';

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'ap-input';
    valueInput.placeholder = 'Значение (напр. 1200×900 мм)';
    valueInput.value = value || '';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ap-dynrow-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', function() { row.remove(); });

    row.append(labelInput, valueInput, removeBtn);
    container.appendChild(row);
  };

  function getSpecsFromForm() {
    const rows = document.querySelectorAll('#specsContainer .ap-dynrow');
    const specs = [];
    rows.forEach(row => {
      const inputs = row.querySelectorAll('.ap-input');
      const label = inputs[0].value.trim();
      const value = inputs[1].value.trim();
      if (label && value) specs.push({ label, value });
    });
    return specs;
  }

  // ===== DYNAMIC OPTION ROWS =====
  window.addOptionRow = function(name, price) {
    const container = document.getElementById('optionsContainer');
    const row = document.createElement('div');
    row.className = 'ap-dynrow';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'ap-input';
    nameInput.placeholder = 'Название опции (напр. Чехол)';
    nameInput.value = name || '';

    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'ap-input ap-input--price';
    priceInput.placeholder = 'Цена (тг)';
    priceInput.min = '0';
    priceInput.value = price || '';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ap-dynrow-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', function() { row.remove(); });

    row.append(nameInput, priceInput, removeBtn);
    container.appendChild(row);
  };

  function getOptionsFromForm() {
    const rows = document.querySelectorAll('#optionsContainer .ap-dynrow');
    const options = [];
    rows.forEach(row => {
      const nameInput = row.querySelector('.ap-input');
      const priceInput = row.querySelector('.ap-input--price');
      const name = nameInput.value.trim();
      const price = parseInt(priceInput.value, 10);
      if (name && price > 0) options.push({ name, price });
    });
    return options;
  }

  function clearDynRows() {
    document.getElementById('specsContainer').innerHTML = '';
    document.getElementById('optionsContainer').innerHTML = '';
  }

  function startEditProduct(p) {
    editingProductId = p.id;
    // Open form if closed
    const panel = document.getElementById('productFormSection');
    if (!panel.classList.contains('ap-form--open')) panel.classList.add('ap-form--open');

    document.getElementById('productFormTitle').textContent = 'Редактировать: ' + p.name;
    document.getElementById('productName').value = p.name;
    document.getElementById('productCategory').value = p.category;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productBadge').value = p.badge || '';
    document.getElementById('productDescription').value = p.description || '';
    document.getElementById('productImageUrl').value = p.image_url || '';
    document.getElementById('productSubmitBtn').textContent = 'Сохранить';
    document.getElementById('productCancelBtn').style.display = 'inline-block';

    // Populate specs
    clearDynRows();
    (p.specs || []).forEach(s => addSpecRow(s.label, s.value));
    // Populate options
    (p.options || []).forEach(o => addOptionRow(o.name, o.price));

    // Scroll form into view
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  window.cancelEditProduct = function() {
    editingProductId = null;
    document.getElementById('productFormTitle').textContent = 'Добавить товар';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = 'bowl';
    document.getElementById('productPrice').value = '';
    document.getElementById('productBadge').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productImageUrl').value = '';
    document.getElementById('productSubmitBtn').textContent = 'Добавить';
    document.getElementById('productCancelBtn').style.display = 'none';
    clearDynRows();
  };

  window.submitProduct = async function() {
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseInt(document.getElementById('productPrice').value, 10);
    const badge = document.getElementById('productBadge').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const image_url = document.getElementById('productImageUrl').value.trim();
    const specs = getSpecsFromForm();
    const options = getOptionsFromForm();

    if (!name) { alert('Введите название товара'); return; }
    if (!price || price <= 0) { alert('Введите корректную цену'); return; }

    const body = { name, description, category, price, badge, image_url, specs, options };

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

  // ===== RECOMMENDATIONS (redesigned with search & filters) =====
  let allProductsCache = [];
  let recSelectedIds = new Set();
  let activeRecFilter = 'all';

  async function openRecommendations(productId, productName) {
    // Load all products for selection
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('err');
      allProductsCache = await res.json();
    } catch(e) {
      alert('Ошибка загрузки товаров');
      return;
    }

    // Load current recommendations
    recSelectedIds = new Set();
    try {
      const res = await apiFetch('/api/admin/products/' + productId + '/recommendations');
      if (res.ok) {
        const data = await res.json();
        (data.product_ids || []).forEach(id => recSelectedIds.add(id));
      }
    } catch(e) { /* ignore */ }

    const modal = document.getElementById('recModal');
    document.getElementById('recModalTitle').textContent = 'Рекомендации: ' + productName;
    modal.dataset.productId = productId;

    // Reset search and filter
    document.getElementById('recSearch').value = '';
    activeRecFilter = 'all';
    document.querySelectorAll('#recChips .ap-chip').forEach(btn => {
      btn.classList.toggle('ap-chip--active', btn.dataset.recFilter === 'all');
    });

    renderRecProducts(productId);
    renderRecSelectedPills();
    modal.classList.add('active');

    // Focus search
    setTimeout(() => document.getElementById('recSearch').focus(), 100);
  }

  function renderRecProducts(productId) {
    productId = productId || parseInt(document.getElementById('recModal').dataset.productId, 10);
    const query = (document.getElementById('recSearch').value || '').toLowerCase().trim();
    const list = document.getElementById('recProductList');
    list.innerHTML = '';

    const filtered = allProductsCache.filter(p => {
      if (p.id === productId) return false;
      const matchFilter = activeRecFilter === 'all' || p.category === activeRecFilter;
      const matchSearch = !query || p.name.toLowerCase().includes(query) ||
        (categoryLabels[p.category] || '').toLowerCase().includes(query);
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-secondary);font-size:0.8rem;">Ничего не найдено</div>';
      return;
    }

    // Sort: selected first, then by name
    filtered.sort((a, b) => {
      const aSelected = recSelectedIds.has(a.id) ? 0 : 1;
      const bSelected = recSelectedIds.has(b.id) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return a.name.localeCompare(b.name, 'ru');
    });

    filtered.forEach(p => {
      const item = document.createElement('label');
      item.className = 'rec-item' + (recSelectedIds.has(p.id) ? ' rec-item--checked' : '');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = p.id;
      cb.checked = recSelectedIds.has(p.id);
      cb.addEventListener('change', function() {
        if (this.checked) {
          if (recSelectedIds.size >= 10) {
            this.checked = false;
            alert('Максимум 10 рекомендаций');
            return;
          }
          recSelectedIds.add(p.id);
          item.classList.add('rec-item--checked');
        } else {
          recSelectedIds.delete(p.id);
          item.classList.remove('rec-item--checked');
        }
        renderRecSelectedPills();
      });

      const info = document.createElement('div');
      info.className = 'rec-item-info';

      const nameSpan = document.createElement('div');
      nameSpan.className = 'rec-item-name';
      nameSpan.textContent = p.name;

      const detail = document.createElement('div');
      detail.className = 'rec-item-detail';
      detail.textContent = categoryLabels[p.category] || p.category;

      info.append(nameSpan, detail);

      const price = document.createElement('span');
      price.className = 'rec-item-price';
      price.textContent = p.price.toLocaleString('ru-RU') + ' \u20B8';

      item.append(cb, info, price);
      list.appendChild(item);
    });
  }

  function renderRecSelectedPills() {
    const container = document.getElementById('recSelectedList');
    const countEl = document.getElementById('recSelectedCount');
    countEl.textContent = recSelectedIds.size;
    container.innerHTML = '';

    recSelectedIds.forEach(id => {
      const product = allProductsCache.find(p => p.id === id);
      if (!product) return;

      const pill = document.createElement('span');
      pill.className = 'rec-pill';

      const text = document.createTextNode(product.name);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'rec-pill-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        recSelectedIds.delete(id);
        renderRecSelectedPills();
        renderRecProducts();
      });

      pill.append(text, removeBtn);
      container.appendChild(pill);
    });
  }

  window.filterRecProducts = function() {
    renderRecProducts();
  };

  window.setRecFilter = function(filter) {
    activeRecFilter = filter;
    document.querySelectorAll('#recChips .ap-chip').forEach(btn => {
      btn.classList.toggle('ap-chip--active', btn.dataset.recFilter === filter);
    });
    renderRecProducts();
  };

  window.closeRecModal = function() {
    document.getElementById('recModal').classList.remove('active');
  };

  window.saveRecommendations = async function() {
    const modal = document.getElementById('recModal');
    const productId = parseInt(modal.dataset.productId, 10);
    const ids = Array.from(recSelectedIds);

    try {
      const res = await apiFetch('/api/admin/products/' + productId + '/recommendations', {
        method: 'PUT',
        body: JSON.stringify({ product_ids: ids })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Ошибка сохранения рекомендаций');
        return;
      }
      closeRecModal();
      loadAdminProducts();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  };

  // Auto-open admin panel on /admin URL
  if (window.location.pathname === '/admin') {
    openAdmin();
  }
})();
