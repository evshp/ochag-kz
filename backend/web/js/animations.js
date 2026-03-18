// ===== SCROLL ANIMATIONS =====
let _scrollObserver = null;

function initScrollAnimations() {
  if (_scrollObserver) _scrollObserver.disconnect();

  _scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach((el) => {
    const parent = el.closest('section') || el.closest('.container');
    const siblings = parent ? parent.querySelectorAll('.fade-up') : [];
    const idx = Array.from(siblings).indexOf(el);
    el.style.transitionDelay = (idx * 0.08) + 's';
    _scrollObserver.observe(el);
  });
}

initScrollAnimations();
