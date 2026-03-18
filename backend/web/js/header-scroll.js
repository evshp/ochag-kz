// ===== HEADER SCROLL SHRINK =====
window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  header.style.padding = window.scrollY > 80 ? '0.6rem 2rem' : '';
}, { passive: true });
