const lightbox = document.querySelector('[data-lightbox]');
const lightboxImage = document.querySelector('[data-lightbox-image]');
const lightboxClose = document.querySelector('[data-lightbox-close]');

document.querySelectorAll('[data-open-shot]').forEach((button) => {
  button.addEventListener('click', () => {
    const src = button.getAttribute('data-open-shot');
    const alt = button.querySelector('img')?.alt || 'NZBarr screenshot';
    lightboxImage.src = src;
    lightboxImage.alt = alt;
    lightbox.hidden = false;
  });
});

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImage.removeAttribute('src');
}

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
});
