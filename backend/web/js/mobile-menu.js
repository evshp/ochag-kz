// ===== MOBILE MENU =====
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', isOpen);
  burger.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
});

nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Открыть меню');
}));
