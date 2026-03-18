// ===== FORM → API + WHATSAPP =====
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const name = form.elements['name'].value;
  const phone = form.elements['phone'].value;
  const msg = form.elements['message'].value;

  const submitBtn = form.querySelector('[type="submit"]');
  const notice = form.querySelector('.form-notice') || (() => {
    const el = document.createElement('p');
    el.className = 'form-notice';
    el.style.cssText = 'margin-top:0.75rem;font-size:0.85rem;text-align:center';
    submitBtn.insertAdjacentElement('afterend', el);
    return el;
  })();

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, message: msg })
    });
    if (!res.ok) {
      notice.style.color = '#e86050';
      notice.textContent = 'Не удалось отправить заявку. Напишите нам напрямую в WhatsApp.';
      console.error('Contact form API error: status', res.status);
    } else {
      notice.style.color = 'var(--accent)';
      notice.textContent = 'Заявка отправлена!';
    }
  } catch (err) {
    notice.style.color = '#e86050';
    notice.textContent = 'Ошибка соединения. Напишите нам напрямую в WhatsApp.';
    console.error('Contact form network error:', err);
  }

  const text = `Здравствуйте! Меня зовут ${name}. Мой номер: ${phone}. ${msg}`;
  window.open(`https://wa.me/77763857050?text=${encodeURIComponent(text)}`, '_blank');
});
