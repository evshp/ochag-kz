// ===== CATALOG API =====
const API_URL = '/api/products';

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRecMini(rec) {
  const imgHtml = rec.image_url
    ? `<img src="${esc(rec.image_url)}" alt="${esc(rec.name)}" class="rec-mini-img">`
    : `<div class="rec-mini-placeholder"></div>`;
  return `<div class="rec-mini-card" data-product-id="${rec.id}">
    ${imgHtml}
    <span class="rec-mini-name">${esc(rec.name)}</span>
    <span class="rec-mini-price">${rec.price.toLocaleString('ru-RU')} &#8376;</span>
  </div>`;
}

function renderCard(p) {
  const badgeClass = p.category === 'bowl' ? 'badge-bowl' : p.category === 'table' ? 'badge-table' : 'badge-oven';
  const specsHtml = (p.specs || []).map(s =>
    `<div class="spec"><span class="spec-label">${esc(s.label)}:</span><span class="spec-value">${esc(s.value)}</span></div>`
  ).join('');
  const optionsHtml = p.options && p.options.length
    ? `<details class="product-options"><summary>Дополнительные опции</summary><ul class="options-list">${
        p.options.map(o => `<li><span>${esc(o.name)}</span><span>${o.price.toLocaleString('ru-RU')} &#8376;</span></li>`).join('')
      }</ul></details>`
    : '';
  const waText = encodeURIComponent(`Здравствуйте! Интересует ${p.name}`);

  const stockClass = p.stock_quantity > 0 ? 'stock-available' : 'stock-unavailable';
  const stockText = p.stock_quantity > 0 ? 'В наличии' : 'Нет в наличии';

  const recsHtml = p.recommendations && p.recommendations.length
    ? `<div class="product-recs">
        <span class="product-recs-title">С этим берут</span>
        <div class="product-recs-list">${p.recommendations.map(renderRecMini).join('')}</div>
      </div>`
    : '';

  return `<div class="product-card fade-up" data-cat="${esc(p.category)}" data-product-id="${p.id}">
    <div class="product-body">
      <span class="product-badge ${badgeClass}">${esc(p.badge)}</span>
      <span class="product-stock ${stockClass}">${stockText}</span>
      <h3 class="product-name">${esc(p.name)}</h3>
      <div class="product-specs">${specsHtml}</div>
      ${optionsHtml}
      ${recsHtml}
      <div class="product-footer">
        <div class="product-price">${p.price.toLocaleString('ru-RU')} <small>&#8376;</small></div>
        <a href="https://wa.me/77763857050?text=${waText}" target="_blank" class="btn btn-primary btn-sm">Заказать</a>
      </div>
    </div>
  </div>`;
}

let allProducts = [];

function renderProducts(products) {
  allProducts = products;
  const grid = document.getElementById('products-grid');
  grid.innerHTML = products.map(renderCard).join('');
  initFilter();
  initScrollAnimations();
}

async function loadProducts() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('API error');
    const products = await res.json();
    renderProducts(products);
  } catch(e) {
    document.getElementById('products-loading').textContent = 'Не удалось загрузить каталог. Попробуйте позже.';
  }
}

// ===== PRODUCT DETAIL MODAL =====
async function openProductDetail(productId) {
  try {
    const res = await fetch(API_URL + '/' + productId);
    if (!res.ok) throw new Error('err');
    const p = await res.json();
    showProductModal(p);
  } catch(e) {
    // silently fail
  }
}

function showProductModal(p) {
  let modal = document.getElementById('productDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'productDetailModal';
    modal.className = 'pd-modal';
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeProductModal();
    });
    document.body.appendChild(modal);
  }

  const specsHtml = (p.specs || []).map(s =>
    `<div class="spec"><span class="spec-label">${esc(s.label)}:</span><span class="spec-value">${esc(s.value)}</span></div>`
  ).join('');

  const optionsHtml = p.options && p.options.length
    ? `<div class="pd-options"><h4>Дополнительные опции</h4><ul class="options-list">${
        p.options.map(o => `<li><span>${esc(o.name)}</span><span>${o.price.toLocaleString('ru-RU')} &#8376;</span></li>`).join('')
      }</ul></div>`
    : '';

  const waText = encodeURIComponent(`Здравствуйте! Интересует ${p.name}`);
  const stockClass = p.stock_quantity > 0 ? 'stock-available' : 'stock-unavailable';
  const stockText = p.stock_quantity > 0 ? 'В наличии' : 'Нет в наличии';

  const recsHtml = p.recommendations && p.recommendations.length
    ? `<div class="pd-recs">
        <h4>С этим товаром берут</h4>
        <div class="pd-recs-grid">${p.recommendations.map(rec => {
          const imgHtml = rec.image_url
            ? `<img src="${esc(rec.image_url)}" alt="${esc(rec.name)}" class="pd-rec-img">`
            : `<div class="pd-rec-placeholder"></div>`;
          return `<div class="pd-rec-card" data-product-id="${rec.id}">
            ${imgHtml}
            <div class="pd-rec-info">
              <span class="pd-rec-name">${esc(rec.name)}</span>
              <span class="pd-rec-price">${rec.price.toLocaleString('ru-RU')} &#8376;</span>
            </div>
          </div>`;
        }).join('')}</div>
      </div>`
    : '';

  const imgHtml = p.image_url
    ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" class="pd-image">`
    : '';

  modal.innerHTML = `<div class="pd-modal-content">
    <button class="pd-close" onclick="closeProductModal()">&times;</button>
    ${imgHtml}
    <div class="pd-body">
      <span class="product-stock ${stockClass}">${stockText}</span>
      <h2 class="pd-name">${esc(p.name)}</h2>
      <div class="pd-specs">${specsHtml}</div>
      ${optionsHtml}
      <div class="pd-price">${p.price.toLocaleString('ru-RU')} <small>&#8376;</small></div>
      <a href="https://wa.me/77763857050?text=${waText}" target="_blank" class="btn btn-primary" style="width:100%;justify-content:center;">Заказать в WhatsApp</a>
      ${recsHtml}
    </div>
  </div>`;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Click on recommended product opens it
  modal.querySelectorAll('.pd-rec-card').forEach(card => {
    card.addEventListener('click', () => {
      const recId = parseInt(card.dataset.productId, 10);
      openProductDetail(recId);
    });
  });
}

window.closeProductModal = function() {
  const modal = document.getElementById('productDetailModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

// ===== CATALOG FILTER =====
function initFilter() {
  const tabs = document.querySelectorAll('.tab-btn');
  const cards = document.querySelectorAll('.product-card');
  const activeFilter = document.querySelector('.tab-btn.active')?.dataset.filter || 'all';
  cards.forEach(c => {
    c.classList.toggle('hidden', activeFilter !== 'all' && c.dataset.cat !== activeFilter);
  });
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.removeAttribute('aria-current'); });
      tab.classList.add('active');
      tab.setAttribute('aria-current', 'true');
      const f = tab.dataset.filter;
      document.querySelectorAll('.product-card').forEach(c => {
        c.classList.toggle('hidden', f !== 'all' && c.dataset.cat !== f);
      });
    });
  });
}

// ===== CLICK HANDLERS =====
document.addEventListener('click', function(e) {
  // Click on recommendation mini-card
  const recMini = e.target.closest('.rec-mini-card');
  if (recMini) {
    e.preventDefault();
    e.stopPropagation();
    openProductDetail(parseInt(recMini.dataset.productId, 10));
    return;
  }

  // Click on product card name to open detail
  const card = e.target.closest('.product-card');
  if (card && !e.target.closest('a') && !e.target.closest('details') && !e.target.closest('.rec-mini-card')) {
    const productId = parseInt(card.dataset.productId, 10);
    if (productId) openProductDetail(productId);
  }
});

loadProducts();
