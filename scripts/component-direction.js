(() => {
  'use strict';
  const index = document.querySelector('.index');
  const brief = document.querySelector('.brief');
  const status = document.querySelector('#status');
  const selection = document.querySelector('#selection');
  const copy = document.querySelector('#copy');
  let selected = document.querySelector('input[name="scope"]:checked').value;
  copy.hidden = false;
  document.querySelectorAll('input[name="scope"]').forEach(input => {
    input.addEventListener('change', () => {
      selected = input.value;
      selection.value = selected;
      status.textContent = `${selected} selected.`;
      copy.firstChild.textContent = 'copy this brief ';
    });
  });
  copy.addEventListener('click', async () => {
    const text = `website brief\nscope: ${selected}\nnext: add your goal, content and timing.`;
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'brief copied. nothing sent.';
      copy.firstChild.textContent = 'copy again ';
    } catch {
      status.textContent = `clipboard unavailable. copy this text: ${text}`;
    }
  });
  index.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    index.open = false;
    const target = document.querySelector(link.hash);
    if (link.hash === '#scope') brief.open = true;
    const focusTarget = target.querySelector('summary, input') || target;
    focusTarget.setAttribute('tabindex', '-1');
    // Native inputs already participate in tab order; do not remove them.
    if (focusTarget.matches('input, summary')) focusTarget.removeAttribute('tabindex');
    focusTarget.focus({ preventScroll: true });
  }));
  document.addEventListener('pointerdown', event => {
    if (!index.contains(event.target)) index.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (index.open) {
      index.open = false;
      index.querySelector('summary').focus();
    } else {
      const detail = document.activeElement.closest('details[open]');
      if (detail) {
        detail.open = false;
        detail.querySelector('summary').focus();
      }
    }
  });
})();
