/* Siftion UI behaviors. No dependencies and no network requests.
   SiftionUI.init(root = document) is safe to repeat and includes root itself.
   SiftionUI.destroy(root = document) releases bindings owned by that scope.
   Native switches, checkbox chips, radio segments and details need no JS. */
(() => {
  'use strict';
  const bound = new WeakMap();
  const bindings = new Set();
  const sources = new WeakMap();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const all = (root, selector) => [
    ...(root.matches?.(selector) ? [root] : []),
    ...root.querySelectorAll(selector)
  ];

  function report(key, error) {
    console.warn(`SiftionUI: ${key} setup or cleanup failed.`, error);
  }

  // Every resource belongs to one component, including partially installed setup.
  function createBinding(el, key) {
    const cleanups = [];
    const timers = new Set();
    let disposed = false;

    return {
      el,
      key,
      on(target, type, listener, options) {
        target.addEventListener(type, listener, options);
        cleanups.push(() => target.removeEventListener(type, listener, options));
      },
      cleanup(callback) {
        cleanups.push(callback);
      },
      timeout(callback, delay) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          if (!disposed) callback();
        }, delay);
        timers.add(timer);
        return timer;
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        timers.forEach(clearTimeout);
        timers.clear();
        // One failed cleanup must not block the rest.
        cleanups.reverse().forEach(callback => {
          try {
            callback();
          } catch (error) {
            report(key, error);
          }
        });
        cleanups.length = 0;
      }
    };
  }

  function once(root, selector, key, setup) {
    all(root, selector).forEach(el => {
      const keys = bound.get(el) || new Map();
      if (keys.has(key)) return;
      const binding = createBinding(el, key);
      try {
        // Incomplete markup remains retryable on the next init.
        if (setup(el, binding) === false) {
          binding.dispose();
          return;
        }
        keys.set(key, binding);
        bound.set(el, keys);
        bindings.add(binding);
      } catch (error) {
        binding.dispose();
        report(key, error);
      }
    });
  }

  function destroy(root = document) {
    bindings.forEach(binding => {
      if (binding.el !== root && !root.contains(binding.el)) return;
      binding.dispose();
      const keys = bound.get(binding.el);
      keys?.delete(binding.key);
      if (!keys?.size) bound.delete(binding.el);
      bindings.delete(binding);
    });
    // Preserve cached initial source rather than exporting transient UI state.
    return root;
  }
  function source(el) {
    if (sources.has(el)) return sources.get(el);
    const clone = el.cloneNode(true);
    all(clone, '[class]').forEach(node => {
      const classes = [...node.classList].filter(c => !c.startsWith('sx-')).join(' ');
      if (classes) node.setAttribute('class', classes);
      else node.removeAttribute('class');
    });
    all(clone, 'svg').forEach(svg => {
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = '→';
      svg.replaceWith(span);
    });
    all(clone, '*').forEach(node => {
      ['data-sf-example','data-demo-button'].forEach(attr => node.removeAttribute(attr));
    });
    const text = clone.outerHTML.replace(/></g, '>\n<');
    sources.set(el, text);
    return text;
  }
  function animate(el, frames, options) {
    if (reduced.matches || typeof el.animate !== 'function') return null;
    const animation = el.animate(frames, options);
    // Cancellation is expected, including if a later animation fails to start.
    animation.finished.catch(() => {});
    return animation;
  }

  function restoreAttribute(el, name, value) {
    if (value === null) el.removeAttribute(name);
    else el.setAttribute(name, value);
  }

  function init(root = document) {
    all(root, '[data-sf-example]').forEach(el => {
      try {
        source(el);
      } catch (error) {
        report('source', error);
      }
    });
    once(root, '[data-sf-async]', 'async', (button, binding) => {
      const label = button.querySelector('[data-sf-async-label]');
      const cap = button.querySelector('.sf-button__cap');
      const status = button.closest('[data-sf-example],.sf-action-sheet')?.querySelector('[data-sf-async-status]');
      if (!button.matches('button') || !label) return false;

      let pending = null;
      binding.cleanup(() => {
        if (!pending) return;
        button.disabled = pending.disabled;
        restoreAttribute(button, 'aria-busy', pending.busy);
        restoreAttribute(button, 'data-state', pending.state);
        label.textContent = pending.label;
        if (cap) cap.textContent = pending.cap;
        if (status) status.textContent = pending.status;
        pending = null;
      });
      binding.on(button, 'click', () => {
        if (button.disabled) return;
        pending = {
          disabled: button.disabled,
          busy: button.getAttribute('aria-busy'),
          state: button.getAttribute('data-state'),
          label: label.textContent,
          cap: cap?.textContent,
          status: status?.textContent
        };
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.dataset.state = 'saving';
        label.textContent = 'saving locally';
        if (cap) cap.textContent = '·';
        if (status) status.textContent = 'simulating a local save.';
        binding.timeout(() => {
          button.disabled = false;
          button.setAttribute('aria-busy', 'false');
          button.dataset.state = 'saved';
          label.textContent = 'save again';
          if (cap) cap.textContent = '✓';
          if (status) status.textContent = 'draft saved in this demo. nothing was sent.';
          pending = null;
        }, 950);
      });
    });
    once(root, '[data-sf-form]', 'form', (form, binding) => {
      const input = form.querySelector('[data-sf-input]');
      const error = form.querySelector('[data-sf-error]');
      const status = form.querySelector('[data-sf-form-status]');
      if (!form.matches('form') || !input?.matches('input,textarea') || !error || !status) return false;

      let saved = false;
      binding.on(form, 'submit', event => {
        event.preventDefault();
        const value = input.value.trim();
        if (!value) {
          input.setAttribute('aria-invalid', 'true');
          error.hidden = false;
          status.textContent = '';
          input.focus();
          return;
        }
        input.removeAttribute('aria-invalid');
        error.hidden = true;
        saved = true;
        status.textContent = `saved "${value}" in this example. nothing was sent or kept after reload.`;
      });
      // Delegate so additional native controls also make a saved receipt dirty.
      const edited = event => {
        if (!event.target.matches?.('input,select,textarea') || event.target.readOnly || event.target.disabled) return;
        if (event.target === input) {
          input.removeAttribute('aria-invalid');
          error.hidden = true;
        }
        status.textContent = saved ? 'edited. save again to update the example.' : '';
      };
      binding.on(form, 'input', edited);
      binding.on(form, 'change', edited);
      binding.on(form, 'reset', () => {
        saved = false;
        input.removeAttribute('aria-invalid');
        error.hidden = true;
        status.textContent = 'fields reset to their starting values. nothing was sent.';
      });
    });
    once(root, '[data-sf-feedback]', 'feedback', (group, binding) => {
      if (!group.querySelector('[data-sf-feedback-status]') || !group.querySelector('input[type="radio"]')) return false;
      const messages = { saved: 'saved locally', attention: 'needs attention', waiting: 'waiting for input' };
      const details = {
        saved: 'The local example is up to date. No further action needed.',
        attention: 'Review the missing information before continuing.',
        waiting: 'Nothing to do yet. The next step becomes available after input.'
      };
      binding.on(group, 'change', event => {
        if (!event.target.matches?.('input[type="radio"]')) return;
        const status = group.querySelector('[data-sf-feedback-status]');
        if (!status) return;
        status.textContent = messages[event.target.value] || 'waiting for input';
        status.classList.toggle('sf-status--hot', event.target.value === 'attention');
        status.dataset.state = Object.hasOwn(messages, event.target.value) ? event.target.value : 'waiting';
        const detail = group.querySelector('[data-sf-feedback-detail]');
        if (detail) detail.textContent = details[status.dataset.state];
      });
    });
    once(root, '[data-sf-dialog-group]', 'dialog', (group, binding) => {
      const dialog = group.querySelector('dialog');
      const opener = group.querySelector('[data-sf-dialog-open]');
      if (!dialog || !opener || typeof dialog.showModal !== 'function') return false;

      let returnTo = opener;
      binding.on(opener, 'click', () => {
        returnTo = document.activeElement;
        if (!dialog.open) dialog.showModal();
      });
      binding.on(dialog, 'close', () => {
        if (returnTo?.isConnected) returnTo.focus();
      });
      binding.cleanup(() => {
        if (dialog.open) dialog.close();
      });
      // Native showModal makes the background inert and handles Escape.
      // Wrap Tab explicitly so focus does not leave for the browser chrome.
      binding.on(dialog, 'keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = [...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')]
          .filter(el => el.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
    });
    once(root, '[data-sf-undo]', 'undo', (group, binding) => {
      // Nested instances own their hooks; a parent never operates on a child.
      const hook = selector => [...group.querySelectorAll(selector)]
        .find(el => el.closest('[data-sf-undo]') === group);
      const item = hook('[data-sf-undo-item]');
      const receipt = hook('[data-sf-receipt]');
      const remove = hook('[data-sf-remove]');
      const undo = hook('[data-sf-restore]');
      const dismiss = hook('[data-sf-dismiss]');
      const reset = hook('[data-sf-undo-reset]');
      const status = hook('[data-sf-undo-status]');
      const empty = hook('[data-sf-undo-empty]');
      if (![item, receipt, remove, undo, dismiss, reset, status].every(Boolean)
        || ![remove, undo, dismiss, reset].every(el => el.matches('button'))) return false;

      const title = hook('[data-sf-undo-title]') || item.querySelector('h3');
      const name = title?.textContent.trim() || 'this entry';
      // Visible DOM is the source of truth across destroy/re-init.
      let state = !item.hidden ? 'present' : !receipt.hidden ? 'removed' : 'dismissed';
      function show(next) {
        state = next;
        item.hidden = next !== 'present';
        receipt.hidden = next !== 'removed';
        reset.hidden = next !== 'dismissed';
        if (empty) empty.hidden = next !== 'dismissed';
      }
      show(state);
      // Announcements live outside the receipt so restore/dismiss stay audible.
      // A legacy receipt-contained status still works, but cannot announce once hidden.
      binding.on(remove, 'click', () => {
        if (state !== 'present') return;
        show('removed');
        status.textContent = `"${name}" removed from this example. undo is available.`;
        undo.focus();
      });
      binding.on(undo, 'click', () => {
        if (state !== 'removed') return;
        show('present');
        status.textContent = `"${name}" restored to this example.`;
        remove.focus();
      });
      binding.on(dismiss, 'click', () => {
        if (state !== 'removed') return;
        show('dismissed');
        status.textContent = `receipt dismissed. "${name}" is still removed from this example.`;
        reset.focus();
      });
      binding.on(reset, 'click', () => {
        if (state !== 'dismissed') return;
        show('present');
        status.textContent = `example reset. "${name}" is back in the reading list.`;
        remove.focus();
      });
    });
    once(root, '[data-sf-split]', 'split', (group, binding) => {
      const button = group.querySelector('[data-sf-split-toggle]');
      const reset = group.querySelector('[data-sf-split-reset]');
      if (!button || !reset) return false;

      function set(open) {
        group.classList.toggle('is-separated', open);
        button.setAttribute('aria-pressed', String(open));
        const label = button.querySelector('[data-motion-label]');
        if (label) label.textContent = open ? 'bring them together' : 'separate the shapes';
        const state = group.querySelector('[data-motion-state]');
        if (state) state.textContent = open ? 'apart' : 'together';
      }
      binding.on(button, 'click', () => set(!group.classList.contains('is-separated')));
      binding.on(reset, 'click', () => set(false));
    });
    once(root, '[data-sf-motion]', 'motion', (group, binding) => {
      const kind = group.dataset.sfMotion;
      const play = group.querySelector('[data-sf-play]');
      const reset = group.querySelector('[data-sf-reset]');
      const status = group.querySelector('[data-sf-motion-status]');
      const items = [...group.querySelectorAll('[data-sf-motion-item]')];
      const body = group.querySelector('[data-sf-expand-body]');
      if (!['expand', 'reveal', 'stagger', 'direction'].includes(kind) || !play || !reset || !status) return false;
      if (kind === 'expand' ? !body : !items.length) return false;

      let animations = [];
      let run = 0;
      let open = kind === 'expand' && !body.hidden;
      const timing = { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' };
      function cancel() {
        run++;
        const previous = animations;
        animations = [];
        previous.forEach(animation => {
          if (!animation) return;
          try {
            animation.cancel();
          } catch (error) {
            report('motion', error);
          }
        });
      }
      binding.cleanup(() => {
        const wasPlaying = animations.length > 0;
        cancel();
        if (kind === 'expand') {
          body.style.height = '';
          body.hidden = !open;
          play.setAttribute('aria-expanded', String(open));
          if (wasPlaying) status.textContent = open ? 'open' : 'closed';
        } else if (wasPlaying) {
          status.textContent = 'ready';
        }
      });
      // This listener is owned by the component, not an immortal global handler.
      binding.on(reduced, 'change', () => {
        if (!reduced.matches) return;
        animations.forEach(animation => {
          if (!animation) return;
          try {
            animation.finish();
          } catch (error) {
            report('motion', error);
          }
        });
      });

      function start() {
        const height = body?.getBoundingClientRect().height || 0;
        cancel();
        const thisRun = run;
        if (kind === 'expand') {
          open = !open;
          play.setAttribute('aria-expanded', String(open));
          body.hidden = false;
          body.style.height = 'auto';
          const target = open ? body.scrollHeight : 0;
          const animation = animate(body, [{ height: `${height}px` }, { height: `${target}px` }], timing);
          animations.push(animation);
          const finish = () => {
            if (thisRun !== run) return;
            cancel();
            body.style.height = '';
            body.hidden = !open;
            status.textContent = open ? 'open' : 'closed';
          };
          status.textContent = open ? 'opening' : 'closing';
          if (animation) animation.finished.then(finish, () => {});
          else finish();
          return;
        }
        items.forEach((item, index) => {
          const frames = kind === 'reveal'
            ? [{ transform: 'translateY(105%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }]
            : kind === 'stagger'
              ? [{ transform: 'translateY(18px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }]
              : [{ transform: 'scale(1)' }, { transform: 'scale(.95)', offset: .5 }, { transform: 'scale(1)' }];
          const animation = animate(item, frames, { ...timing, delay: kind === 'stagger' ? index * 70 : 0 });
          if (animation) animations.push(animation);
          if (kind === 'direction') {
            const cap = item.querySelector('.sf-button__cap');
            if (cap) {
              const spin = animate(cap, [
                { transform: 'translateX(0)' },
                { transform: 'translateX(4px)' },
                { transform: 'translateX(0)' }
              ], timing);
              if (spin) animations.push(spin);
            }
          }
        });
        status.textContent = animations.length ? 'playing' : 'ready';
        Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(() => {
          if (thisRun !== run) return;
          status.textContent = 'ready';
          cancel();
        });
      }
      binding.on(play, 'click', start);
      if (kind === 'direction') items.forEach(item => binding.on(item, 'click', start));
      binding.on(reset, 'click', () => {
        cancel();
        open = false;
        if (body) {
          body.hidden = true;
          body.style.height = '';
          play.setAttribute('aria-expanded', 'false');
        }
        status.textContent = 'reset';
      });
    });
    return root;
  }
  window.SiftionUI = Object.freeze({ init, destroy, source });
})();
