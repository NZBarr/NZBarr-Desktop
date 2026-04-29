document.addEventListener('DOMContentLoaded', () => {
  const setupAjaxForm = ({ formSelector, statusSelector, successSelector, buildPayload }) => {
    const form = document.querySelector(formSelector);
    if (!form) return;

    const status = document.querySelector(statusSelector);
    const success = document.querySelector(successSelector);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const submitButton = form.querySelector('button[type="submit"]');
      const payload = buildPayload(formData);

      if (status) {
        status.textContent = 'Sending...';
      }

      if (submitButton) {
        submitButton.disabled = true;
      }

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) {
          throw new Error(result?.message || 'We could not send the request right now.');
        }

        form.reset();
        if (status) {
          status.textContent = '';
        }
        if (success) {
          success.hidden = false;
        }
        form.hidden = true;
      } catch (error) {
        if (status) {
          status.textContent = error.message || 'Something went wrong while sending the request.';
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
    });
  };

  setupAjaxForm({
    formSelector: '#license-request-form',
    statusSelector: '#license-request-status',
    successSelector: '#license-request-success',
    buildPayload: (formData) => ({
      plan: String(formData.get('plan') || '').trim(),
      platform: String(formData.get('platform') || '').trim(),
      paypalEmail: String(formData.get('paypalEmail') || '').trim(),
      licenseEmail: String(formData.get('licenseEmail') || '').trim(),
      customerName: String(formData.get('customerName') || '').trim(),
      transactionId: String(formData.get('transactionId') || '').trim(),
      notes: String(formData.get('notes') || '').trim(),
      company: String(formData.get('company') || '').trim()
    })
  });

  setupAjaxForm({
    formSelector: '#contact-request-form',
    statusSelector: '#contact-request-status',
    successSelector: '#contact-request-success',
    buildPayload: (formData) => ({
      topic: String(formData.get('topic') || '').trim(),
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      subject: String(formData.get('subject') || '').trim(),
      message: String(formData.get('message') || '').trim(),
      company: String(formData.get('company') || '').trim()
    })
  });

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close image preview">×</button>
    <figure class="lightbox-figure">
      <img class="lightbox-image" alt="" />
      <figcaption class="lightbox-caption"></figcaption>
    </figure>
  `;
  document.body.appendChild(overlay);

  const image = overlay.querySelector('.lightbox-image');
  const caption = overlay.querySelector('.lightbox-caption');
  const closeBtn = overlay.querySelector('.lightbox-close');

  const close = () => {
    overlay.hidden = true;
    document.body.classList.remove('lightbox-open');
    image.removeAttribute('src');
    image.alt = '';
    caption.textContent = '';
  };

  const open = (src, alt, text) => {
    image.src = src;
    image.alt = alt || '';
    caption.textContent = text || alt || '';
    overlay.hidden = false;
    document.body.classList.add('lightbox-open');
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-lightbox]');
    if (!trigger) return;
    event.preventDefault();
    const src = trigger.getAttribute('href') || trigger.dataset.src;
    if (!src) return;
    open(src, trigger.querySelector('img')?.alt || trigger.dataset.alt || '', trigger.dataset.caption || '');
  });

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) close();
  });
});
