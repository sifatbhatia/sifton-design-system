/* Siftion UI showcase. No dependencies, remote requests, or library mutations. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const themeKey = 'siftion-showcase:mode';
  const darkPreference = window.matchMedia('(prefers-color-scheme: dark)');
  const mobileNavigation = window.matchMedia('(max-width: 767px)');
  let explicitlySelectedTheme = false;
  try { explicitlySelectedTheme = ['light', 'night'].includes(localStorage.getItem(themeKey)); } catch (_) { /* Optional persistence. */ }

  function setTheme(mode, persist = false) {
    const night = mode === 'night';
    root.dataset.mode = night ? 'night' : 'light';
    const button = $('[data-theme-toggle]');
    button.setAttribute('aria-pressed', String(night));
    button.setAttribute('aria-label', night ? 'Use light theme' : 'Use dark theme');
    $('use', button).setAttribute('href', night ? '#sx-sun' : '#sx-moon');
    $('meta[name="theme-color"]').content = night ? '#151515' : '#efeee9';
    if (persist) {
      explicitlySelectedTheme = true;
      try { localStorage.setItem(themeKey, root.dataset.mode); } catch (_) { /* State still works for this visit. */ }
    }
  }
  setTheme(root.dataset.mode);
  $('[data-theme-toggle]').addEventListener('click', () => setTheme(root.dataset.mode === 'night' ? 'light' : 'night', true));
  darkPreference.addEventListener('change', (event) => {
    if (!explicitlySelectedTheme) setTheme(event.matches ? 'night' : 'light');
  });

  const menu = $('#site-nav');
  const menuButton = $('[data-menu-toggle]');
  function setMenu(open, restoreFocus = false) {
    menu.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    $('use', menuButton).setAttribute('href', open ? '#sx-close' : '#sx-menu');
    if (restoreFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });
  mobileNavigation.addEventListener('change', () => setMenu(false));

  let toastTimer;
  function announce(message) {
    const toast = $('[data-toast]');
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3400);
  }

  const copyDialog = $('[data-copy-dialog]');
  let copyReturnFocus = null;
  async function copyText(text, message, trigger) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      announce(message);
    } catch (_) {
      copyReturnFocus = trigger || document.activeElement;
      $('#manual-copy').value = text;
      if (!copyDialog.open) copyDialog.showModal();
      $('#manual-copy').focus();
      $('#manual-copy').select();
    }
  }
  $$('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => copyDialog.close()));
  copyDialog.addEventListener('close', () => {
    if (copyReturnFocus instanceof HTMLElement && copyReturnFocus.isConnected) copyReturnFocus.focus();
  });

  $$('input[name="hero-weight"]').forEach((radio) => radio.addEventListener('change', () => {
    $('[data-hero-glyph]').style.fontWeight = radio.value;
  }));
  $('[data-rearrange]').addEventListener('click', (event) => {
    const button = event.currentTarget;
    const open = button.classList.toggle('is-open');
    button.setAttribute('aria-pressed', String(open));
    $('[data-rearrange-label]').textContent = open ? 'Bring it back' : 'Rearrange';
  });
  let heroClicks = 0;
  $('[data-hero-action]').addEventListener('click', () => {
    heroClicks += 1;
    $('[data-hero-feedback]').textContent = heroClicks === 1 ? 'Nice. Feedback, included.' : `Click ${heroClicks}. Still works.`;
  });

  const specimen = $('#type-specimen');
  const typeSize = $('#type-size');
  const originalText = specimen.value;
  const weightNames = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
  let userSizedType = false;
  let measuredTypeWidth = 0;

  function fitTextHeight() {
    specimen.style.height = 'auto';
    const styles = getComputedStyle(specimen);
    const minimum = parseFloat(styles.minHeight) || 150;
    const maximum = parseFloat(styles.maxHeight) || 640;
    specimen.style.height = `${Math.min(maximum, Math.max(minimum, specimen.scrollHeight))}px`;
  }
  function setTypeSize(size) {
    const bounded = Math.max(Number(typeSize.min), Math.min(Number(typeSize.max), Math.round(size)));
    typeSize.value = String(bounded);
    specimen.style.setProperty('--sx-type-size', `${bounded}px`);
    $('#type-size-output').value = `${bounded} px`;
    typeSize.setAttribute('aria-valuetext', `${bounded} pixels`);
    fitTextHeight();
  }
  function adaptTypeSize() {
    const width = specimen.clientWidth;
    typeSize.max = String(Math.max(48, Math.min(180, Math.round(width * 0.35))));
    setTypeSize(userSizedType ? Number(typeSize.value) : Math.max(36, Math.min(116, Math.round(width * 0.12))));
  }
  function setTypeWeight(weight) {
    if (!Object.hasOwn(weightNames, weight)) return;
    specimen.style.setProperty('--sx-type-weight', weight);
    $('[data-type-weight-label]').textContent = `${weightNames[weight]} / ${weight}`;
    fitTextHeight();
  }
  typeSize.addEventListener('input', () => { userSizedType = true; setTypeSize(Number(typeSize.value)); });
  specimen.addEventListener('input', fitTextHeight);
  $$('input[name="type-weight"]').forEach((radio) => radio.addEventListener('change', () => setTypeWeight(radio.value)));
  $('[data-reset-type]').addEventListener('click', () => {
    specimen.value = originalText;
    userSizedType = false;
    $('input[name="type-weight"][value="500"]').checked = true;
    setTypeWeight('500');
    adaptTypeSize();
    announce('Type specimen reset.');
  });
  adaptTypeSize();
  if ('ResizeObserver' in window) {
    new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (Math.abs(width - measuredTypeWidth) < 1) return;
      measuredTypeWidth = width;
      adaptTypeSize();
    }).observe($('.sx-type-lab'));
  } else {
    window.addEventListener('resize', adaptTypeSize, { passive: true });
  }
  document.fonts.ready.then(fitTextHeight);

  // The original light-mode primitives are deliberate, stable swatches, not theme overrides.
  const palette = {
    paper: { name: 'Paper', hex: '#efeee9', ink: '#151515', role: 'The foundation', description: 'A warm, quiet canvas. It leaves room for the content and makes the sharper accents feel deliberate.' },
    ink: { name: 'Ink', hex: '#151515', ink: '#efeee9', role: 'Hierarchy & contrast', description: 'The weight in the composition. Type, structure, and moments that need a little more presence.' },
    signal: { name: 'Signal', hex: '#3f4dff', ink: '#ffffff', role: 'Action & emphasis', description: 'A decisive blue for the action, detail, or idea that deserves your attention.' },
    hot: { name: 'Hot', hex: '#ff6547', ink: '#151515', role: 'Attention & energy', description: 'A warmer interruption. Useful when something needs a closer look or a change in temperature.' },
    acid: { name: 'Acid', hex: '#c9ff36', ink: '#151515', role: 'Contrast & expression', description: 'A bright counterpoint to ink. Give it a clear role and enough space to make its presence count.' },
    violet: { name: 'Violet', hex: '#cdbbff', ink: '#151515', role: 'A softer accent', description: 'A quieter change of tone. An alternative to the louder accents, with the same underlying structure.' }
  };
  let selectedColor = 'signal';
  function luminance(hex) {
    const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
    const linear = rgb.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }
  function selectColor(key) {
    if (!Object.hasOwn(palette, key)) return;
    selectedColor = key;
    const color = palette[key];
    const stage = $('[data-color-stage]');
    stage.style.setProperty('--sx-preview', color.hex);
    stage.style.setProperty('--sx-preview-ink', color.ink);
    $('[data-color-name]').textContent = color.name;
    $('[data-color-role]').textContent = `${color.name} / ${color.role}`;
    $('[data-color-description]').textContent = color.description;
    $('[data-color-code]').textContent = `--sf-${key}: ${color.hex};`;
    const [a, b] = [luminance(color.hex), luminance(color.ink)].sort((x, y) => y - x);
    $('[data-color-contrast]').textContent = `${((a + 0.05) / (b + 0.05)).toFixed(2)}:1`;
  }
  $$('input[name="palette"]').forEach((radio) => radio.addEventListener('change', () => selectColor(radio.value)));
  $('[data-copy-color]').addEventListener('click', (event) => {
    copyText(`--sf-${selectedColor}: ${palette[selectedColor].hex};`, `${palette[selectedColor].name} token copied.`, event.currentTarget);
  });
  selectColor(selectedColor);

  const snippets = {
    primary: { label: 'Primary button', code: '<button class="sf-button sf-button--primary"\n  type="button">\n  Continue <span aria-hidden="true">&rarr;</span>\n</button>' },
    signal: { label: 'Signal button', code: '<button class="sf-button sf-button--signal"\n  type="button">\n  Choose this\n</button>' },
    ghost: { label: 'Ghost button', code: '<button class="sf-button sf-button--ghost"\n  type="button">\n  Maybe later\n</button>' },
    inputs: { label: 'Text field', code: '<label class="sf-field">\n  <span class="sf-mono">Name your idea</span>\n  <input type="text"\n    placeholder="Something worth making"\n    maxlength="64" required>\n</label>' }
  };
  const feedbackStates = {
    saved: { text: 'Saved', className: 'sf-status' },
    attention: { text: 'Needs attention', className: 'sf-status sf-status--hot' },
    waiting: { text: 'Waiting for input', className: 'sf-status' }
  };
  let activeTab = 'buttons';
  let selectedButton = 'primary';
  let selectedState = 'saved';
  let currentSnippet = '';
  let savedExample = null;
  function updateSnippet() {
    let snippet;
    if (activeTab === 'states') {
      const state = feedbackStates[selectedState];
      snippet = { label: 'Feedback state', code: `<span class="${state.className}"\n  role="status">\n  ${state.text}\n</span>` };
    } else {
      snippet = snippets[activeTab === 'inputs' ? 'inputs' : selectedButton];
    }
    currentSnippet = snippet.code;
    $('[data-component-code]').textContent = currentSnippet;
    $('[data-snippet-label]').textContent = `HTML / ${snippet.label}`;
  }
  const tabs = $$('[data-tab]');
  function activateTab(name, moveFocus = false) {
    if (!tabs.some((tab) => tab.dataset.tab === name)) return;
    activeTab = name;
    tabs.forEach((tab) => {
      const selected = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      $(`#${tab.getAttribute('aria-controls')}`).hidden = !selected;
      if (selected && moveFocus) tab.focus();
    });
    updateSnippet();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      activateTab(tabs[next].dataset.tab, true);
    });
  });
  $$('[data-demo-button]').forEach((button) => button.addEventListener('click', () => {
    selectedButton = button.dataset.demoButton;
    updateSnippet();
    $('[data-button-feedback]').textContent = `${snippets[selectedButton].label} selected. Its markup is ready to copy.`;
  }));
  $('[data-copy-component]').addEventListener('click', (event) => copyText(currentSnippet, 'Component HTML copied.', event.currentTarget));
  $$('input[name="feedback-state"]').forEach((radio) => radio.addEventListener('change', () => {
    selectedState = radio.value;
    const state = feedbackStates[selectedState];
    const preview = $('[data-state-preview]');
    preview.className = `${state.className} sx-status-example`;
    preview.textContent = state.text;
    updateSnippet();
  }));
  const exampleForm = $('[data-example-form]');
  const exampleInput = $('#example-name');
  const exampleError = $('#example-error');
  const formFeedback = $('[data-form-feedback]');
  exampleForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = exampleInput.value.trim();
    if (!name) {
      exampleInput.setAttribute('aria-invalid', 'true');
      exampleError.hidden = false;
      formFeedback.textContent = '';
      exampleInput.focus();
      return;
    }
    exampleInput.removeAttribute('aria-invalid');
    exampleError.hidden = true;
    savedExample = Object.freeze({ name });
    formFeedback.textContent = `Saved "${savedExample.name}" for this session.`;
  });
  exampleInput.addEventListener('input', () => {
    exampleInput.removeAttribute('aria-invalid');
    exampleError.hidden = true;
    formFeedback.textContent = savedExample ? 'Edited. Save again to update this example.' : '';
  });
  exampleForm.addEventListener('reset', () => {
    savedExample = null;
    exampleInput.removeAttribute('aria-invalid');
    exampleError.hidden = true;
    formFeedback.textContent = 'Example reset.';
  });
  updateSnippet();

  const motionDemo = $('[data-motion-demo]');
  $$('input[name="motion-speed"]').forEach((radio) => radio.addEventListener('change', () => {
    if (['fast', 'base', 'slow'].includes(radio.value)) motionDemo.style.setProperty('--sx-motion-duration', `var(--sf-${radio.value})`);
  }));
  $('[data-motion-toggle]').addEventListener('click', (event) => {
    const separated = motionDemo.classList.toggle('is-separated');
    event.currentTarget.setAttribute('aria-pressed', String(separated));
    $('[data-motion-label]').textContent = separated ? 'Bring them together' : 'Separate the shapes';
    $('[data-motion-state]').textContent = separated ? 'Apart' : 'Together';
  });

  // Navigation only; content is never hidden behind scroll-triggered animations.
  if ('IntersectionObserver' in window) {
    const observedSections = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => observedSections.set(entry.target.id, entry.isIntersecting));
      const current = ['typography', 'color', 'components', 'motion'].find((id) => observedSections.get(id));
      $$('a', menu).forEach((link) => {
        if (current && link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-90px 0px -48% 0px', threshold: 0 });
    ['typography', 'color', 'components', 'motion'].forEach((id) => observer.observe(document.getElementById(id)));
  }
})();
