// ===== ADMIN STOCK PAGE =====
(function() {
  if (!AdminCommon.requireAuth()) return;

  var user = AdminCommon.getUser();
  var categoryLabels = AdminCommon.categoryLabels;
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

  loadStock();

  async function loadStock() {
    try {
      var res = await AdminCommon.apiFetch('/api/admin/inventory');
      if (!res.ok) throw new Error('Failed to load stock');
      var items = await res.json();
      renderStock(items);
    } catch(e) {
      console.error('Load stock error:', e);
    }
  }

  function renderStock(items) {
    var grid = document.getElementById('stockGrid');
    grid.innerHTML = '';

    items.forEach(function(item, i) {
      var card = document.createElement('div');
      card.className = 'sk-card';
      card.style.animationDelay = (i * 0.05) + 's';

      var statusClass = item.quantity > 0 ? 'sk-status--ok' : 'sk-status--empty';
      var statusText = item.quantity > 0 ? 'В наличии' : 'Нет в наличии';
      var catLabel = categoryLabels[item.category] || item.category;

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
      var btn = e.target.closest('[data-id]');
      if (!btn) return;
      var id = parseInt(btn.dataset.id, 10);

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
    var el = document.getElementById('skAdjust_' + productId);
    if (!el) return;
    var isOpen = el.classList.contains('sk-adjust--open');
    document.querySelectorAll('.sk-adjust--open').forEach(function(f) { f.classList.remove('sk-adjust--open'); });
    if (!isOpen && !forceClose) {
      el.classList.add('sk-adjust--open');
      el.querySelector('.sk-input').focus();
    }
  }

  function openAdjustWithDelta(productId, delta) {
    var el = document.getElementById('skAdjust_' + productId);
    if (!el) return;
    document.querySelectorAll('.sk-adjust--open').forEach(function(f) { f.classList.remove('sk-adjust--open'); });
    el.classList.add('sk-adjust--open');
    var deltaEl = document.getElementById('skDelta_' + productId);
    var reasonEl = document.getElementById('skReason_' + productId);
    deltaEl.value = delta;
    reasonEl.value = delta > 0 ? 'Поступление' : 'Списание';
    reasonEl.focus();
  }

  async function submitAdjust(productId) {
    var deltaEl = document.getElementById('skDelta_' + productId);
    var reasonEl = document.getElementById('skReason_' + productId);
    var delta = parseInt(deltaEl.value, 10);
    if (isNaN(delta) || delta === 0) { deltaEl.focus(); return; }
    var reason = reasonEl.value.trim() || (delta > 0 ? 'Поступление' : 'Списание');

    try {
      var res = await AdminCommon.apiFetch('/api/admin/inventory/' + productId, {
        method: 'PUT',
        body: JSON.stringify({ delta: delta, reason: reason })
      });
      if (!res.ok) {
        var data = await res.json();
        alert(data.error || 'Ошибка');
        return;
      }
      loadStock();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  }

  async function toggleLogs(productId, productName) {
    var el = document.getElementById('skLogs_' + productId);
    if (!el) return;
    if (el.classList.contains('sk-logs--open')) {
      el.classList.remove('sk-logs--open');
      return;
    }
    document.querySelectorAll('.sk-logs--open').forEach(function(f) { f.classList.remove('sk-logs--open'); });

    el.innerHTML = '<div class="sk-logs-loading">Загрузка...</div>';
    el.classList.add('sk-logs--open');

    try {
      var res = await AdminCommon.apiFetch('/api/admin/inventory/' + productId + '/logs');
      if (!res.ok) throw new Error('err');
      var logs = await res.json();
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

    var html = '<div class="sk-logs-title">История: ' + productName + '</div><div class="sk-logs-list">';
    logs.forEach(function(l) {
      var date = new Date(l.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      var cls = l.delta > 0 ? 'sk-log-plus' : 'sk-log-minus';
      var sign = l.delta > 0 ? '+' : '';
      html += '<div class="sk-log-row">' +
        '<span class="sk-log-date">' + date + '</span>' +
        '<span class="sk-log-delta ' + cls + '">' + sign + l.delta + '</span>' +
        '<span class="sk-log-reason">' + (l.reason || '\u2014') + '</span>' +
      '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }
})();
