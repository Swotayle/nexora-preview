const worldInfo = {
  COSMORA: { title: 'COSMORA', description: 'Gezegenleri, yıldızları ve uzayın derinliklerini keşfetmeye hazır mısın?', symbol: '✦' },
  STUDORA: { title: 'STUDORA', description: 'Derslerini düzenle, öğrenme yolculuğunu kendi hızında şekillendir.', symbol: '∞' },
  CHRONOVA: { title: 'CHRONOVA', description: 'Tarihin dönüm noktalarını ziyaret et ve geleceğin ihtimallerini düşün.', symbol: '◷' },
  PIXELVERSE: { title: 'PIXELVERSE', description: 'Mini oyunlara katıl, yeni rekorlar için reflekslerini dene.', symbol: '▦' },
  NEOCITY: { title: 'NEOCITY', description: 'Kendi şehrini kur ve daha iyi bir gelecek için fikirlerini tasarla.', symbol: '⌂' }
};

const nav = document.querySelector('.nav');
const menuToggle = document.querySelector('.menu-toggle');
const dialog = document.querySelector('.world-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogDescription = document.querySelector('#dialog-description');
const dialogSymbol = document.querySelector('.dialog-symbol');
const localRunNotice = document.querySelector('#localRunNotice');
if (location.protocol === 'file:' && localRunNotice) {
  localRunNotice.hidden = false;
  document.querySelector('#closeLocalRunNotice')?.addEventListener('click', () => { localRunNotice.hidden = true; });
}


function openWorld(name) {
  const world = worldInfo[name];
  if (!world) return;
  document.querySelectorAll('.world-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.worldCard === name);
  });
  dialogTitle.textContent = world.title;
  dialogDescription.textContent = world.description;
  dialogSymbol.textContent = world.symbol;
  dialog.showModal();
}

document.querySelectorAll('[data-open-world], .planet[data-world]').forEach((item) => {
  item.addEventListener('click', (event) => {
    const name = item.dataset.openWorld || item.dataset.world;
    if (!worldInfo[name]) return;
    event.preventDefault();
    openWorld(name);
  });
});

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('.dialog-done').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => {
  document.querySelectorAll('.world-card').forEach((card) => card.classList.remove('selected'));
});

menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Menüyü kapat' : 'Menüyü aç');
});
nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Menüyü aç');
  });
});

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.nav-link')];
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-35% 0px -55% 0px' });
sections.forEach((section) => observer.observe(section));
