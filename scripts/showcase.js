/* Siftion UI showcase. No dependencies, remote requests, or library mutations. */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('sx-enhanced');
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [
    ...scope.querySelectorAll(selector),
  ];
  const themeKey = 'siftion-showcase:mode';
  const mobileNavigation = window.matchMedia('(max-width: 767px)');

  function setTheme(mode, persist = false) {
    const night = mode === 'night';
    root.dataset.mode = night ? 'night' : 'light';
    const button = $('[data-theme-toggle]');
    button.setAttribute('aria-pressed', String(night));
    button.setAttribute(
      'aria-label',
      night ? 'use light theme' : 'use dark theme',
    );
    $('use', button).setAttribute('href', night ? '#sx-sun' : '#sx-moon');
    $('meta[name="theme-color"]').content = night ? '#151515' : '#efeee9';
    if (persist) {
      try {
        localStorage.setItem(themeKey, root.dataset.mode);
      } catch (_) {
        /* State still works for this visit. */
      }
    }
  }
  setTheme(root.dataset.mode);
  $('[data-theme-toggle]').addEventListener('click', () =>
    setTheme(root.dataset.mode === 'night' ? 'light' : 'night', true),
  );
  // The portfolio opens dark. An explicit theme selection is persisted.

  const menu = $('#site-nav');
  const menuButton = $('[data-menu-toggle]');
  function setMenu(open, restoreFocus = false) {
    menu.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute(
      'aria-label',
      open ? 'close navigation' : 'open navigation',
    );
    $('use', menuButton).setAttribute('href', open ? '#sx-close' : '#sx-menu');
    if (restoreFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () =>
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true'),
  );
  $$('a', menu).forEach((link) =>
    link.addEventListener('click', () => setMenu(false)),
  );
  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      menuButton.getAttribute('aria-expanded') === 'true'
    )
      setMenu(false, true);
  });
  mobileNavigation.addEventListener('change', () => setMenu(false));
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.sx-header')) setMenu(false);
  });

  let toastTimer;
  function announce(message) {
    const toast = $('[data-toast]');
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(
      () => toast.classList.remove('is-visible'),
      3400,
    );
  }

  const copyDialog = $('[data-copy-dialog]');
  let copyReturnFocus = null;
  async function copyText(text, message, trigger) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText)
        throw new Error('Clipboard unavailable');
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
  $$('[data-close-dialog]').forEach((button) =>
    button.addEventListener('click', () => copyDialog.close()),
  );
  copyDialog.addEventListener('close', () => {
    if (copyReturnFocus instanceof HTMLElement && copyReturnFocus.isConnected)
      copyReturnFocus.focus();
  });

  $$('input[name="hero-weight"]').forEach((radio) =>
    radio.addEventListener('change', () => {
      $('[data-hero-glyph]').style.fontWeight = radio.value;
    }),
  );
  $('[data-rearrange]').addEventListener('click', (event) => {
    const button = event.currentTarget;
    const open = button.classList.toggle('is-open');
    button.setAttribute('aria-pressed', String(open));
    $('[data-rearrange-label]').textContent = open
      ? 'Restore the order'
      : 'Change the layout';
  });
  const heroSamples = ['Aa', 'Rr', 'aeg', '012', '&?!'];
  let heroSample = 0;
  $('[data-hero-action]').addEventListener('click', () => {
    heroSample = (heroSample + 1) % heroSamples.length;
    $('[data-hero-glyph]').textContent = heroSamples[heroSample];
    $('[data-hero-feedback]').textContent =
      `specimen ${heroSample + 1} of ${heroSamples.length}`;
  });

  const specimen = $('#type-specimen');
  const typeSize = $('#type-size');
  const originalText = specimen.value;
  const weightNames = {
    400: 'regular',
    500: 'medium',
    600: 'semibold',
    700: 'bold',
  };
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
    const bounded = Math.max(
      Number(typeSize.min),
      Math.min(Number(typeSize.max), Math.round(size)),
    );
    typeSize.value = String(bounded);
    specimen.style.setProperty('--sx-type-size', `${bounded}px`);
    $('#type-size-output').value = `${bounded} px`;
    typeSize.setAttribute('aria-valuetext', `${bounded} pixels`);
    fitTextHeight();
  }
  function adaptTypeSize() {
    const width = specimen.clientWidth;
    typeSize.max = String(
      Math.max(48, Math.min(180, Math.round(width * 0.35))),
    );
    setTypeSize(
      userSizedType
        ? Number(typeSize.value)
        : Math.max(36, Math.min(116, Math.round(width * 0.12))),
    );
  }
  function setTypeWeight(weight) {
    if (!Object.hasOwn(weightNames, weight)) return;
    specimen.style.setProperty('--sx-type-weight', weight);
    $('[data-type-weight-label]').textContent =
      `${weightNames[weight]} / ${weight}`;
    fitTextHeight();
  }
  typeSize.addEventListener('input', () => {
    userSizedType = true;
    setTypeSize(Number(typeSize.value));
  });
  specimen.addEventListener('input', fitTextHeight);
  $$('input[name="type-weight"]').forEach((radio) =>
    radio.addEventListener('change', () => setTypeWeight(radio.value)),
  );
  $('[data-reset-type]').addEventListener('click', () => {
    specimen.value = originalText;
    userSizedType = false;
    $('input[name="type-weight"][value="500"]').checked = true;
    setTypeWeight('500');
    adaptTypeSize();
    announce('type specimen reset.');
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
    paper: {
      name: 'paper',
      hex: '#efeee9',
      ink: '#151515',
      role: 'page and surface',
      description:
        'a warm page color for long reading and open space. use ink for the text.',
    },
    ink: {
      name: 'ink',
      hex: '#151515',
      ink: '#efeee9',
      role: 'type and structure',
      description:
        'the darkest tone for text, rules, and neutral controls. pair it with paper.',
    },
    signal: {
      name: 'signal',
      hex: '#3f4dff',
      ink: '#ffffff',
      role: 'action and emphasis',
      description:
        'the primary action and selected controls. use white on a blue fill; text-only accents use a lighter Signal tone in dark mode.',
    },
    hot: {
      name: 'hot',
      hex: '#ff6547',
      ink: '#151515',
      role: 'attention and warning',
      description:
        'warnings, invalid fields, and actions such as removal. use ink on an orange fill, and always include a label or message.',
    },
  };
  let selectedColor = 'signal';
  function luminance(hex) {
    const rgb = [1, 3, 5].map(
      (start) => parseInt(hex.slice(start, start + 2), 16) / 255,
    );
    const linear = rgb.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
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
    const [a, b] = [luminance(color.hex), luminance(color.ink)].sort(
      (x, y) => y - x,
    );
    $('[data-color-contrast]').textContent =
      `${((a + 0.05) / (b + 0.05)).toFixed(2)}:1`;
  }
  $$('input[name="palette"]').forEach((radio) =>
    radio.addEventListener('change', () => selectColor(radio.value)),
  );
  $('[data-copy-color]').addEventListener('click', (event) => {
    copyText(
      `--sf-${selectedColor}: ${palette[selectedColor].hex};`,
      `${palette[selectedColor].name} token copied.`,
      event.currentTarget,
    );
  });
  selectColor(selectedColor);

  // Take source snapshots before initialization or demo state changes.
  const labels = {
    primary: 'primary action',
    signal: 'secondary action',
    ghost: 'text action',
    icon: 'icon action',
    async: 'local save',
  };
  const snippets = {};
  $$('.sx-component-preview [data-demo-button]').forEach((button) => {
    const key = button.dataset.demoButton;
    let code = SiftionUI.source(button);
    if (key === 'async')
      code = `<div class="sf-action-sheet" data-sf-example>\n${code}\n<p class="sf-caption" role="status" data-sf-async-status>local demo only.</p>\n</div>`;
    snippets[key] = { label: labels[key], code };
  });
  $$('.sx-tab-panel').forEach((panel) => {
    const sample = $('[data-sf-example]', panel);
    const key = panel.id.replace('panel-', '');
    const names = {
      inputs: 'validated field',
      states: 'feedback',
      choices: 'native choices',
      disclosure: 'disclosure',
      dialog: 'native modal',
      undo: 'undo receipt',
      buttons: 'actions',
      tabs: 'content tabs',
      menu: 'action menu',
    };
    if (sample)
      snippets[key] = { label: names[key], code: SiftionUI.source(sample), navigation: key === 'tabs' || key === 'menu' };
  });
  const dependencyNote =
    '<!-- Load styles/tokens.css, styles/components.css, styles/library.css.\nLoad scripts/library.js, then call SiftionUI.init(document).\nUse unique ids and radio names for each instance. -->\n';
  const navigationDependencyNote =
    '<!-- Load styles/tokens.css and styles/navigation.css.\nLoad scripts/navigation.js, then call SiftionNavigation.init(document).\nUse unique ids for each instance. -->\n';
  let activeTab = 'buttons';
  let selectedButton = 'primary';
  let currentSnippet = '';
  function updateSnippet() {
    const snippet =
      snippets[activeTab === 'buttons' ? selectedButton : activeTab];
    currentSnippet = (snippet.navigation ? navigationDependencyNote : dependencyNote) + snippet.code;
    $('[data-component-dependencies]').textContent = snippet.navigation
      ? 'load tokens.css, navigation.css, and navigation.js. initialize with SiftionNavigation.init(root).'
      : 'load tokens.css, components.css, library.css, and library.js. initialize with SiftionUI.init(root).';
    $('[data-component-code]').textContent = currentSnippet;
    $('[data-snippet-label]').textContent = `HTML / ${snippet.label}`;
  }
  const componentBoard = $('[data-component-workspace]');
  componentBoard.addEventListener('sf:tabchange', (event) => {
    // Nested content tabs own their selection; only the board changes this source panel.
    if (event.target !== componentBoard) return;
    activeTab = event.detail.tab.dataset.tab;
    updateSnippet();
  });
  $$('[data-demo-button]').forEach((button) =>
    button.addEventListener('click', () => {
      selectedButton = button.dataset.demoButton;
      updateSnippet();
      $('[data-button-feedback]').textContent =
        `${snippets[selectedButton].label} selected. its markup is ready to copy.`;
    }),
  );
  $('[data-copy-component]').addEventListener('click', (event) =>
    copyText(currentSnippet, 'component HTML copied.', event.currentTarget),
  );
  updateSnippet();
  const splitSource = $('[data-split-source]');
  $('code', splitSource).textContent =
    dependencyNote + SiftionUI.source($('[data-sf-split]'));
  $$('[data-recipe]').forEach((recipe) => {
    $('code', recipe).textContent =
      dependencyNote + SiftionUI.source($('[data-sf-example]', recipe));
  });
  $$('[data-copy-recipe]').forEach((button) =>
    button.addEventListener('click', () => {
      copyText(
        $('code', button.closest('details')).textContent,
        'implementation copied.',
        button,
      );
    }),
  );
  SiftionUI.init(document);
  SiftionNavigation.init(document);
  // Export selected native states, not an unrelated initial radio.
  ['states', 'choices'].forEach((name) => {
    const sample = $(`#panel-${name} [data-sf-example]`);
    sample.addEventListener('change', () => {
      const clone = sample.cloneNode(true);
      const originals = $$('input', sample);
      $$('input', clone).forEach((input, index) =>
        input.toggleAttribute('checked', originals[index].checked),
      );
      snippets[name].code = SiftionUI.source(clone);
      if (activeTab === name) updateSnippet();
    });
  });

  const motionDemo = $('[data-motion-demo]');
  $$('input[name="motion-speed"]').forEach((radio) =>
    radio.addEventListener('change', () => {
      if (['fast', 'base', 'slow'].includes(radio.value))
        motionDemo.style.setProperty(
          '--sx-motion-duration',
          `var(--sf-${radio.value})`,
        );
    }),
  );
  // Current chapter follows the reading line, not a leftover sliver above it.
  const chapters = ['typography', 'color', 'components', 'motion'].map((id) =>
    document.getElementById(id),
  );
  let navigationFrame = 0;
  function updateLocation() {
    navigationFrame = 0;
    const current = chapters
      .filter(
        (section) => section.getBoundingClientRect().top <= innerHeight * 0.42,
      )
      .at(-1)?.id;
    $$('a', menu).forEach((link) => {
      if (current && link.hash === `#${current}`)
        link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleLocation() {
    if (!navigationFrame)
      navigationFrame = requestAnimationFrame(updateLocation);
  }
  window.addEventListener('scroll', scheduleLocation, { passive: true });
  window.addEventListener('resize', scheduleLocation, { passive: true });
  updateLocation();
})();
