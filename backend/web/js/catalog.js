// ===== CATALOG API =====
const API_URL = '/api/products';

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  return `<div class="product-card fade-up" data-cat="${esc(p.category)}">
    <div class="product-body">
      <span class="product-badge ${badgeClass}">${esc(p.badge)}</span>
      <h3 class="product-name">${esc(p.name)}</h3>
      <div class="product-specs">${specsHtml}</div>
      ${optionsHtml}
      <div class="product-footer">
        <div class="product-price">${p.price.toLocaleString('ru-RU')} <small>&#8376;</small></div>
        <a href="https://wa.me/77763857050?text=${waText}" target="_blank" class="btn btn-primary btn-sm">Заказать</a>
      </div>
    </div>
  </div>`;
}

function renderProducts(products) {
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

loadProducts();
