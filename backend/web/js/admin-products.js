// ===== ADMIN PRODUCTS PAGE =====
(function() {
  if (!AdminCommon.requireAuth()) return;

  var user = AdminCommon.getUser();
  var categoryLabels = AdminCommon.categoryLabels;
  var esc = AdminCommon.esc;
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

  var canManage = user.role === 'admin' || user.role === 'manager';
  if (!canManage) {
    document.getElementById('productFormSection').style.display = 'none';
  }

  var allAdminProducts = [];
  var activeProductFilter = 'all';
  var editingProductId = null;
  var pendingImageFile = null;   // file selected but not yet uploaded
  var currentImageUrl = '';       // existing image URL for edit mode

  // ===== LOAD & FILTER =====
  loadAdminProducts();

  async function loadAdminProducts() {
    try {
      var res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      allAdminProducts = await res.json();
      filterProducts();
    } catch(e) {
      console.error('Load products error:', e);
    }
  }

  function filterProducts() {
    var query = (document.getElementById('productSearch').value || '').toLowerCase().trim();
    var sort = document.getElementById('productSort').value;

    var filtered = allAdminProducts.filter(function(p) {
      var matchesFilter = activeProductFilter === 'all' || p.category === activeProductFilter;
      var matchesSearch = !query || p.name.toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query) ||
        (categoryLabels[p.category] || '').toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });

    filtered.sort(function(a, b) {
      if (sort === 'name') return a.name.localeCompare(b.name, 'ru');
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'category') return (a.category || '').localeCompare(b.category || '');
      return 0;
    });

    var countEl = document.getElementById('productSearchCount');
    if (query || activeProductFilter !== 'all') {
      countEl.textContent = filtered.length + ' из ' + allAdminProducts.length;
    } else {
      countEl.textContent = '';
    }

    renderAdminProducts(filtered);
  }

  document.getElementById('productSearch').addEventListener('input', filterProducts);
  document.getElementById('productSort').addEventListener('change', filterProducts);

  // Filter chips
  document.getElementById('productFilters').addEventListener('click', function(e) {
    var chip = e.target.closest('.ap-chip');
    if (!chip) return;
    activeProductFilter = chip.dataset.filter;
    document.querySelectorAll('#productFilters .ap-chip').forEach(function(btn) {
      btn.classList.toggle('ap-chip--active', btn.dataset.filter === activeProductFilter);
    });
    filterProducts();
  });

  // ===== RENDER PRODUCTS =====
  function renderAdminProducts(products) {
    var grid = document.getElementById('adminProductsGrid');
    var emptyEl = document.getElementById('adminProductsEmpty');

    if (products.length === 0) {
      grid.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }
    grid.style.display = '';
    emptyEl.style.display = 'none';
    grid.innerHTML = '';

    products.forEach(function(p, i) {
      var card = document.createElement('div');
      card.className = 'ap-card';
      card.style.animationDelay = (i * 0.04) + 's';

      var catLabel = categoryLabels[p.category] || p.category;
      var priceStr = p.price.toLocaleString('ru-RU') + ' \u20B8';
      var recCount = (p.recommendations || []).length;

      var imgHtml;
      if (p.image_url) {
        imgHtml = '<img class="ap-card-img" src="' + esc(p.image_url) + '" alt="' + esc(p.name) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="ap-card-img--placeholder" style="display:none"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
      } else {
        imgHtml = '<div class="ap-card-img--placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
      }

      var badgeHtml = p.badge ? '<span class="ap-card-badge">' + esc(p.badge) + '</span>' : '';
      var descHtml = p.description ? '<div class="ap-card-desc">' + esc(p.description) + '</div>' : '';

      var specsCount = (p.specs || []).length;
      var optionsCount = (p.options || []).length;
      var specsHtml = '';
      if (specsCount > 0) {
        specsHtml = '<div class="ap-card-specs">';
        (p.specs || []).slice(0, 3).forEach(function(s) {
          specsHtml += '<span class="ap-card-spec">' + esc(s.label) + ': <strong>' + esc(s.value) + '</strong></span>';
        });
        if (specsCount > 3) specsHtml += '<span class="ap-card-spec ap-card-spec--more">+' + (specsCount - 3) + '</span>';
        specsHtml += '</div>';
      }

      var actionsHtml = '';
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
          '<div class="ap-card-cat">' + esc(catLabel) + '</div>' +
          '<div class="ap-card-name">' + esc(p.name) + '</div>' +
          descHtml +
          specsHtml +
          '<div class="ap-card-meta">' +
            '<span class="ap-card-price">' + priceStr + '</span>' +
            badgeHtml +
          '</div>' +
          (optionsCount > 0 ? '<div class="ap-card-opts-info">' + optionsCount + ' опци' + (optionsCount === 1 ? 'я' : optionsCount < 5 ? 'и' : 'й') + '</div>' : '') +
        '</div>' +
        actionsHtml;

      card.addEventListener('click', function(e) {
        var actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        var action = actionBtn.dataset.action;
        if (action === 'edit') startEditProduct(p);
        else if (action === 'rec') openRecommendations(p.id, p.name);
        else if (action === 'del') deleteProduct(p.id, p.name);
      });

      grid.appendChild(card);
    });
  }

  // ===== COLLAPSIBLE FORM =====
  document.getElementById('productFormToggle').addEventListener('click', function() {
    document.getElementById('productFormSection').classList.toggle('ap-form--open');
  });

  // ===== DYNAMIC SPEC ROWS =====
  function addSpecRow(label, value) {
    var container = document.getElementById('specsContainer');
    var row = document.createElement('div');
    row.className = 'ap-dynrow';

    var labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'ap-input';
    labelInput.placeholder = 'Название (напр. Размер, Сталь, Вес)';
    labelInput.value = label || '';

    var valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'ap-input';
    valueInput.placeholder = 'Значение (напр. 1200×900 мм)';
    valueInput.value = value || '';

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ap-dynrow-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', function() { row.remove(); });

    row.append(labelInput, valueInput, removeBtn);
    container.appendChild(row);
  }

  document.getElementById('addSpecBtn').addEventListener('click', function() { addSpecRow(); });

  function getSpecsFromForm() {
    var rows = document.querySelectorAll('#specsContainer .ap-dynrow');
    var specs = [];
    rows.forEach(function(row) {
      var inputs = row.querySelectorAll('.ap-input');
      var label = inputs[0].value.trim();
      var value = inputs[1].value.trim();
      if (label && value) specs.push({ label: label, value: value });
    });
    return specs;
  }

  // ===== DYNAMIC OPTION ROWS =====
  function addOptionRow(name, price) {
    var container = document.getElementById('optionsContainer');
    var row = document.createElement('div');
    row.className = 'ap-dynrow';

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'ap-input';
    nameInput.placeholder = 'Название опции (напр. Чехол)';
    nameInput.value = name || '';

    var priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'ap-input ap-input--price';
    priceInput.placeholder = 'Цена (тг)';
    priceInput.min = '0';
    priceInput.value = price || '';

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ap-dynrow-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', function() { row.remove(); });

    row.append(nameInput, priceInput, removeBtn);
    container.appendChild(row);
  }

  document.getElementById('addOptionBtn').addEventListener('click', function() { addOptionRow(); });

  function getOptionsFromForm() {
    var rows = document.querySelectorAll('#optionsContainer .ap-dynrow');
    var options = [];
    rows.forEach(function(row) {
      var nameInput = row.querySelector('.ap-input');
      var priceInput = row.querySelector('.ap-input--price');
      var name = nameInput.value.trim();
      var price = parseInt(priceInput.value, 10);
      if (name && price > 0) options.push({ name: name, price: price });
    });
    return options;
  }

  function clearDynRows() {
    document.getElementById('specsContainer').innerHTML = '';
    document.getElementById('optionsContainer').innerHTML = '';
  }

  // ===== IMAGE UPLOAD =====
  var uploadZone = document.getElementById('imageUploadZone');
  var fileInput = document.getElementById('imageFileInput');
  var previewEl = document.getElementById('imagePreview');
  var previewImg = document.getElementById('imagePreviewImg');
  var placeholderEl = document.getElementById('imagePlaceholder');
  var removeBtn = document.getElementById('imageRemoveBtn');

  function showImagePreview(src) {
    previewImg.src = src;
    previewEl.style.display = 'flex';
    placeholderEl.style.display = 'none';
  }

  function clearImagePreview() {
    pendingImageFile = null;
    currentImageUrl = '';
    previewImg.src = '';
    previewEl.style.display = 'none';
    placeholderEl.style.display = 'flex';
    fileInput.value = '';
  }

  function handleFileSelect(file) {
    if (!file) return;
    var validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Допустимые форматы: JPG, PNG, WebP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой (макс. 10 МБ)');
      return;
    }
    pendingImageFile = file;
    var reader = new FileReader();
    reader.onload = function(e) { showImagePreview(e.target.result); };
    reader.readAsDataURL(file);
  }

  // Click to select file
  uploadZone.addEventListener('click', function(e) {
    if (e.target.closest('.ap-upload-remove')) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) handleFileSelect(this.files[0]);
  });

  // Drag & Drop
  uploadZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadZone.classList.add('ap-upload--dragover');
  });
  uploadZone.addEventListener('dragleave', function() {
    uploadZone.classList.remove('ap-upload--dragover');
  });
  uploadZone.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadZone.classList.remove('ap-upload--dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  // Remove image
  removeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    clearImagePreview();
  });

  async function uploadImageForProduct(productId) {
    if (!pendingImageFile) return currentImageUrl;
    uploadZone.classList.add('ap-upload--uploading');
    try {
      var formData = new FormData();
      formData.append('file', pendingImageFile);
      var res = await AdminCommon.apiFetch('/api/admin/products/' + productId + '/image', {
        method: 'POST',
        body: formData,
        rawBody: true
      });
      if (!res.ok) {
        var data = await res.json();
        throw new Error(data.error || 'Ошибка загрузки фото');
      }
      var result = await res.json();
      return result.image_url;
    } finally {
      uploadZone.classList.remove('ap-upload--uploading');
    }
  }

  // ===== EDIT PRODUCT =====
  function startEditProduct(p) {
    editingProductId = p.id;
    var panel = document.getElementById('productFormSection');
    if (!panel.classList.contains('ap-form--open')) panel.classList.add('ap-form--open');

    document.getElementById('productFormTitle').textContent = 'Редактировать: ' + p.name;
    document.getElementById('productName').value = p.name;
    document.getElementById('productCategory').value = p.category;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productBadge').value = p.badge || '';
    document.getElementById('productDescription').value = p.description || '';
    // Image preview for existing product
    pendingImageFile = null;
    currentImageUrl = p.image_url || '';
    if (currentImageUrl) {
      showImagePreview(currentImageUrl);
    } else {
      clearImagePreview();
    }
    document.getElementById('productSubmitBtn').textContent = 'Сохранить';
    document.getElementById('productCancelBtn').style.display = 'inline-block';

    clearDynRows();
    (p.specs || []).forEach(function(s) { addSpecRow(s.label, s.value); });
    (p.options || []).forEach(function(o) { addOptionRow(o.name, o.price); });

    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.getElementById('productCancelBtn').addEventListener('click', function() {
    editingProductId = null;
    document.getElementById('productFormTitle').textContent = 'Добавить товар';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = 'bowl';
    document.getElementById('productPrice').value = '';
    document.getElementById('productBadge').value = '';
    document.getElementById('productDescription').value = '';
    clearImagePreview();
    document.getElementById('productSubmitBtn').textContent = 'Добавить';
    document.getElementById('productCancelBtn').style.display = 'none';
    clearDynRows();
  });

  // ===== SUBMIT PRODUCT =====
  document.getElementById('productSubmitBtn').addEventListener('click', async function() {
    var name = document.getElementById('productName').value.trim();
    var category = document.getElementById('productCategory').value;
    var price = parseInt(document.getElementById('productPrice').value, 10);
    var badge = document.getElementById('productBadge').value.trim();
    var description = document.getElementById('productDescription').value.trim();
    var specs = getSpecsFromForm();
    var options = getOptionsFromForm();

    if (!name) { alert('Введите название товара'); return; }
    if (!price || price <= 0) { alert('Введите корректную цену'); return; }

    var body = { name: name, description: description, category: category, price: price, badge: badge, image_url: currentImageUrl, specs: specs, options: options };

    try {
      var res;
      var productId;
      if (editingProductId) {
        res = await AdminCommon.apiFetch('/api/admin/products/' + editingProductId, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
        productId = editingProductId;
      } else {
        res = await AdminCommon.apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }

      if (!res.ok) {
        var data = await res.json();
        alert(data.error || 'Ошибка сохранения товара');
        return;
      }

      // If creating, get the new product ID from the response
      if (!editingProductId) {
        var created = await res.json();
        productId = created.id;
      }

      // Upload image if a new file was selected
      if (pendingImageFile && productId) {
        try {
          await uploadImageForProduct(productId);
        } catch(imgErr) {
          alert('Товар сохранён, но фото не загрузилось: ' + imgErr.message);
        }
      }

      document.getElementById('productCancelBtn').click();
      loadAdminProducts();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  });

  // ===== DELETE PRODUCT =====
  async function deleteProduct(id, name) {
    if (!confirm('Удалить товар "' + name + '"?')) return;

    try {
      var res = await AdminCommon.apiFetch('/api/admin/products/' + id, { method: 'DELETE' });
      if (!res.ok) {
        var data = await res.json();
        alert(data.error || 'Ошибка удаления');
        return;
      }
      loadAdminProducts();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  }

  // ===== RECOMMENDATIONS =====
  var allProductsCache = [];
  var recSelectedIds = new Set();
  var activeRecFilter = 'all';

  async function openRecommendations(productId, productName) {
    try {
      var res = await fetch('/api/products');
      if (!res.ok) throw new Error('err');
      allProductsCache = await res.json();
    } catch(e) {
      alert('Ошибка загрузки товаров');
      return;
    }

    recSelectedIds = new Set();
    try {
      var res = await AdminCommon.apiFetch('/api/admin/products/' + productId + '/recommendations');
      if (res.ok) {
        var data = await res.json();
        (data.product_ids || []).forEach(function(id) { recSelectedIds.add(id); });
      }
    } catch(e) { /* ignore */ }

    var modal = document.getElementById('recModal');
    document.getElementById('recModalTitle').textContent = 'Рекомендации: ' + productName;
    modal.dataset.productId = productId;

    document.getElementById('recSearch').value = '';
    activeRecFilter = 'all';
    document.querySelectorAll('#recChips .ap-chip').forEach(function(btn) {
      btn.classList.toggle('ap-chip--active', btn.dataset.recFilter === 'all');
    });

    renderRecProducts(productId);
    renderRecSelectedPills();
    modal.classList.add('active');

    setTimeout(function() { document.getElementById('recSearch').focus(); }, 100);
  }

  function renderRecProducts(productId) {
    productId = productId || parseInt(document.getElementById('recModal').dataset.productId, 10);
    var query = (document.getElementById('recSearch').value || '').toLowerCase().trim();
    var list = document.getElementById('recProductList');
    list.innerHTML = '';

    var filtered = allProductsCache.filter(function(p) {
      if (p.id === productId) return false;
      var matchFilter = activeRecFilter === 'all' || p.category === activeRecFilter;
      var matchSearch = !query || p.name.toLowerCase().includes(query) ||
        (categoryLabels[p.category] || '').toLowerCase().includes(query);
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:1.5rem;color:var(--text-secondary);font-size:0.8rem;">Ничего не найдено</div>';
      return;
    }

    filtered.sort(function(a, b) {
      var aS = recSelectedIds.has(a.id) ? 0 : 1;
      var bS = recSelectedIds.has(b.id) ? 0 : 1;
      if (aS !== bS) return aS - bS;
      return a.name.localeCompare(b.name, 'ru');
    });

    filtered.forEach(function(p) {
      var item = document.createElement('label');
      item.className = 'rec-item' + (recSelectedIds.has(p.id) ? ' rec-item--checked' : '');

      var cb = document.createElement('input');
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

      var info = document.createElement('div');
      info.className = 'rec-item-info';

      var nameSpan = document.createElement('div');
      nameSpan.className = 'rec-item-name';
      nameSpan.textContent = p.name;

      var detail = document.createElement('div');
      detail.className = 'rec-item-detail';
      detail.textContent = categoryLabels[p.category] || p.category;

      info.append(nameSpan, detail);

      var price = document.createElement('span');
      price.className = 'rec-item-price';
      price.textContent = p.price.toLocaleString('ru-RU') + ' \u20B8';

      item.append(cb, info, price);
      list.appendChild(item);
    });
  }

  function renderRecSelectedPills() {
    var container = document.getElementById('recSelectedList');
    var countEl = document.getElementById('recSelectedCount');
    countEl.textContent = recSelectedIds.size;
    container.innerHTML = '';

    recSelectedIds.forEach(function(id) {
      var product = allProductsCache.find(function(p) { return p.id === id; });
      if (!product) return;

      var pill = document.createElement('span');
      pill.className = 'rec-pill';

      var text = document.createTextNode(product.name);

      var removeBtn = document.createElement('button');
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

  document.getElementById('recSearch').addEventListener('input', function() { renderRecProducts(); });

  document.getElementById('recChips').addEventListener('click', function(e) {
    var chip = e.target.closest('.ap-chip');
    if (!chip) return;
    activeRecFilter = chip.dataset.recFilter;
    document.querySelectorAll('#recChips .ap-chip').forEach(function(btn) {
      btn.classList.toggle('ap-chip--active', btn.dataset.recFilter === activeRecFilter);
    });
    renderRecProducts();
  });

  document.getElementById('recCloseBtn').addEventListener('click', function() {
    document.getElementById('recModal').classList.remove('active');
  });
  document.getElementById('recCancelBtn').addEventListener('click', function() {
    document.getElementById('recModal').classList.remove('active');
  });

  document.getElementById('recSaveBtn').addEventListener('click', async function() {
    var modal = document.getElementById('recModal');
    var productId = parseInt(modal.dataset.productId, 10);
    var ids = Array.from(recSelectedIds);

    try {
      var res = await AdminCommon.apiFetch('/api/admin/products/' + productId + '/recommendations', {
        method: 'PUT',
        body: JSON.stringify({ product_ids: ids })
      });
      if (!res.ok) {
        var data = await res.json();
        alert(data.error || 'Ошибка сохранения рекомендаций');
        return;
      }
      modal.classList.remove('active');
      loadAdminProducts();
    } catch(e) {
      alert('Ошибка подключения к серверу');
    }
  });
})();
