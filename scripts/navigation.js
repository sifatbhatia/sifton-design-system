/* Siftion navigation. No dependencies, storage, clipboard or network calls.
   Explicit init includes root; destroy removes every owned listener. */
(() => {
  'use strict';
  const bindings = new Map();
  let nextId = 0;
  const all = (root, selector) => [
    ...(root.matches?.(selector) ? [root] : []),
    ...root.querySelectorAll(selector)
  ];
  const own = (group, selector, boundary) => [...group.querySelectorAll(selector)]
    .filter(node => node.closest(boundary) === group);
  const disabled = node => node.disabled || node.getAttribute('aria-disabled') === 'true';

  function id(node, prefix) {
    if (node.id) return node.id;
    const doc = node.ownerDocument;
    let value;
    do { value = `sf-${prefix}-${++nextId}`; } while (doc.getElementById(value));
    node.id = value;
    return value;
  }

  function binding(group) {
    const cleanups = [];
    const captured = new WeakMap();
    let disposed = false;
    return {
      on(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        cleanups.push(() => target.removeEventListener(type, handler, options));
      },
      save(node, names) {
        const seen = captured.get(node) || new Set();
        names.forEach(name => {
          if (seen.has(name)) return;
          seen.add(name);
          const value = node.getAttribute(name);
          cleanups.push(() => {
            if (value === null) node.removeAttribute(name);
            else node.setAttribute(name, value);
          });
        });
        captured.set(node, seen);
      },
      cleanup(callback) { cleanups.push(callback); },
      dispose() {
        if (disposed) return;
        disposed = true;
        cleanups.reverse().forEach(callback => {
          try { callback(); }
          catch (error) { console.warn('SiftionNavigation: cleanup failed.', group, error); }
        });
        cleanups.length = 0;
      }
    };
  }

  function setupTabs(group, resource) {
    const lists = own(group, '[data-sf-tablist]', '[data-sf-tabs]');
    const tabs = own(group, '[data-sf-tab]', '[data-sf-tabs]');
    const panels = own(group, '[data-sf-tabpanel]', '[data-sf-tabs]');
    const list = lists[0];
    if (lists.length !== 1 || !tabs.length || panels.length !== tabs.length ||
        tabs.some(tab => !tab.matches('button') || !list.contains(tab))) return false;
    const pairs = tabs.map(tab => {
      const controls = tab.getAttribute('aria-controls');
      const key = tab.dataset.sfTab;
      const matches = panels.filter(panel => controls
        ? panel.id === controls
        : key && panel.dataset.sfTabpanel === key);
      return { tab, panel: matches.length === 1 ? matches[0] : null };
    });
    if (pairs.some(pair => !pair.panel) || new Set(pairs.map(pair => pair.panel)).size !== pairs.length ||
        !tabs.some(tab => !disabled(tab))) return false;

    resource.save(group, ['data-sf-navigation-ready']);
    resource.save(list, ['role', 'aria-orientation']);
    list.setAttribute('role', 'tablist');
    if (!list.hasAttribute('aria-orientation')) list.setAttribute('aria-orientation', 'horizontal');
    pairs.forEach(({ tab, panel }) => {
      resource.save(tab, ['role', 'aria-selected', 'aria-controls', 'tabindex', 'type']);
      resource.save(panel, ['role', 'aria-labelledby', 'tabindex', 'hidden']);
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', id(panel, 'panel'));
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', id(tab, 'tab'));
      if (!panel.hasAttribute('tabindex')) panel.tabIndex = 0;
    });

    function activate(pair, moveFocus = false, notify = true) {
      if (!pair || disabled(pair.tab)) return;
      const changed = pair.tab.getAttribute('aria-selected') !== 'true' || !group.hasAttribute('data-sf-navigation-ready');
      pairs.forEach(current => {
        const selected = current === pair;
        current.tab.setAttribute('aria-selected', String(selected));
        current.tab.tabIndex = selected ? 0 : -1;
        current.panel.hidden = !selected;
      });
      if (moveFocus) pair.tab.focus();
      if (changed && notify) group.dispatchEvent(new CustomEvent('sf:tabchange', {
        bubbles: true, detail: { tab: pair.tab, panel: pair.panel }
      }));
    }
    activate(pairs.find(pair => pair.tab.getAttribute('aria-selected') === 'true' && !disabled(pair.tab)) ||
      pairs.find(pair => !disabled(pair.tab)), false, false);
    group.setAttribute('data-sf-navigation-ready', 'tabs');

    resource.on(list, 'click', event => {
      const tab = event.target.closest?.('[data-sf-tab]');
      const pair = pairs.find(current => current.tab === tab);
      if (!pair) return;
      if (disabled(tab)) { event.preventDefault(); return; }
      activate(pair);
    });
    resource.on(list, 'keydown', event => {
      const current = pairs.find(pair => pair.tab === event.target);
      if (!current || event.altKey || event.ctrlKey || event.metaKey) return;
      const available = pairs.filter(pair => !disabled(pair.tab));
      if (!available.length) return;
      const vertical = list.getAttribute('aria-orientation') === 'vertical';
      const rtl = getComputedStyle(list).direction === 'rtl';
      let step = 0;
      let target;
      if (event.key === 'Home') target = available[0];
      else if (event.key === 'End') target = available.at(-1);
      else if (vertical && event.key === 'ArrowDown') step = 1;
      else if (vertical && event.key === 'ArrowUp') step = -1;
      else if (!vertical && event.key === 'ArrowRight') step = rtl ? -1 : 1;
      else if (!vertical && event.key === 'ArrowLeft') step = rtl ? 1 : -1;
      else return;
      event.preventDefault();
      if (step) target = available[(available.indexOf(current) + step + available.length) % available.length];
      activate(target, true);
    });
  }

  function setupMenu(group, resource) {
    const find = selector => own(group, selector, '[data-sf-menu]')[0];
    const disclosure = find('[data-sf-menu-disclosure]');
    const trigger = find('[data-sf-menu-trigger]');
    const panel = find('[data-sf-menu-panel]');
    const status = find('[data-sf-menu-status]');
    if (!disclosure?.matches('details') || !trigger?.matches('summary') ||
        trigger.parentElement !== disclosure || !panel || !disclosure.contains(panel) || !status) return false;
    const items = own(group, '[data-sf-menu-item]', '[data-sf-menu]')
      .filter(item => item.closest('[data-sf-menu-panel]') === panel);
    if (!items.length || items.some(item => !item.matches('button,a[href]'))) return false;
    const doc = group.ownerDocument;
    const view = doc.defaultView;
    const native = typeof panel.showPopover === 'function' && typeof panel.hidePopover === 'function';
    let open = false;
    const local = group.hasAttribute('data-sf-menu-local');
    const list = find('[data-sf-menu-list]');
    const record = find('[data-sf-menu-record]');
    const reset = find('[data-sf-menu-reset]');
    const recordTitle = record?.querySelector('[data-sf-menu-record-title]');
    if (local && (!list || !record || !recordTitle || !list.contains(record) || !reset)) return false;
    const copies = new Set();

    resource.save(group, ['data-sf-navigation-ready']);
    resource.save(disclosure, ['open']);
    resource.save(trigger, ['aria-haspopup', 'aria-expanded', 'aria-controls']);
    resource.save(panel, ['role', 'aria-labelledby', 'tabindex', 'hidden', 'popover', 'style', 'data-sf-menu-open']);
    resource.save(status, ['role', 'aria-live', 'aria-atomic']);
    const initialStatus = status.textContent;
    resource.cleanup(() => { status.textContent = initialStatus; });
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-controls', id(panel, 'menu'));
    trigger.setAttribute('aria-expanded', 'false');
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-labelledby', id(trigger, 'menu-trigger'));
    panel.tabIndex = -1;
    if (native) panel.setAttribute('popover', 'manual');
    else panel.removeAttribute('popover');
    panel.hidden = true;
    disclosure.open = false;
    items.forEach(item => {
      resource.save(item, ['role', 'tabindex', 'type', 'aria-disabled']);
      item.setAttribute('role', 'menuitem');
      item.tabIndex = -1;
      if (item.matches('button')) item.type = 'button';
    });
    if (local) resource.save(record, ['hidden']);
    group.setAttribute('data-sf-navigation-ready', 'menu');

    const available = () => items.filter(item => !disabled(item) && !item.hidden);
    function focusItem(index = 0) {
      const enabled = available();
      (enabled[index < 0 ? enabled.length - 1 : index] || panel).focus();
    }
    function close(returnFocus = false) {
      if (!open) return;
      open = false;
      if (native && panel.matches(':popover-open')) panel.hidePopover();
      panel.hidden = true;
      panel.removeAttribute('data-sf-menu-open');
      disclosure.open = false;
      trigger.setAttribute('aria-expanded', 'false');
      if (returnFocus && trigger.isConnected) trigger.focus();
    }
    function position() {
      if (!open) return;
      // Popovers outlive a hidden ancestor; close when their owning tab disappears.
      if (!trigger.getClientRects().length || trigger.closest('[hidden]')) { close(); return; }
      const viewport = view.visualViewport;
      const x = viewport?.offsetLeft || 0;
      const y = viewport?.offsetTop || 0;
      const width = viewport?.width || doc.documentElement.clientWidth;
      const height = viewport?.height || view.innerHeight;
      const gap = 12;
      panel.style.maxWidth = `${Math.max(0, width - gap * 2)}px`;
      panel.style.maxHeight = `${Math.max(0, height - gap * 2)}px`;
      const anchor = trigger.getBoundingClientRect();
      const box = panel.getBoundingClientRect();
      const left = Math.max(x + gap, Math.min(anchor.right - box.width, x + width - box.width - gap));
      const below = anchor.bottom + 8;
      const above = anchor.top - box.height - 8;
      const top = Math.max(y + gap, Math.min(below + box.height <= y + height - gap ? below : above, y + height - box.height - gap));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    }
    function show(index = 0) {
      if (disabled(trigger)) return;
      if (!open) {
        open = true;
        disclosure.open = true;
        panel.hidden = false;
        panel.setAttribute('data-sf-menu-open', '');
        trigger.setAttribute('aria-expanded', 'true');
        if (native) panel.showPopover();
      }
      position();
      if (open) focusItem(index);
    }
    resource.cleanup(() => {
      close(panel.contains(doc.activeElement));
      copies.forEach(copy => copy.remove());
      copies.clear();
    });

    function syncLocal() {
      if (!local) return;
      items.forEach(item => {
        const action = item.dataset.sfMenuItem;
        if (action === 'duplicate' || action === 'archive') item.setAttribute('aria-disabled', String(record.hidden));
        if (action === 'restore') item.setAttribute('aria-disabled', String(!record.hidden));
      });
    }
    syncLocal();
    function localAction(action) {
      if (action === 'duplicate') {
        const copy = record.cloneNode(true);
        copy.removeAttribute('data-sf-menu-record');
        // The local record contract is plain text, not another component instance.
        all(copy, '[id]').forEach(node => node.removeAttribute('id'));
        copy.querySelector('[data-sf-menu-record-title]').textContent = `${recordTitle.textContent} (copy)`;
        copy.hidden = false;
        list.append(copy);
        copies.add(copy);
        status.textContent = 'added a copy to this example list. nothing is saved after reload.';
      } else if (action === 'archive') {
        record.hidden = true;
        status.textContent = 'archived the original in this example. use restore original to bring it back.';
      } else if (action === 'restore') {
        record.hidden = false;
        status.textContent = 'restored the original to this example list.';
      } else return false;
      syncLocal();
      return true;
    }
    resource.on(trigger, 'click', event => {
      event.preventDefault();
      if (open) close(true);
      else show();
    });
    resource.on(trigger, 'keydown', event => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      show(event.key === 'ArrowUp' ? -1 : 0);
    });
    resource.on(panel, 'keydown', event => {
      if (!open || event.altKey || event.ctrlKey || event.metaKey) return;
      const enabled = available();
      const index = enabled.indexOf(doc.activeElement);
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % enabled.length;
      else if (event.key === 'ArrowUp') next = index < 0 ? enabled.length - 1 : (index - 1 + enabled.length) % enabled.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = enabled.length - 1;
      else if (event.key === 'Tab') { close(true); return; }
      else if (event.key === ' ' && event.target.matches('a[data-sf-menu-item]')) {
        event.preventDefault();
        event.target.click();
        return;
      } else return;
      event.preventDefault();
      if (enabled.length) enabled[next].focus();
    });
    resource.on(panel, 'click', event => {
      const item = event.target.closest?.('[data-sf-menu-item]');
      if (!items.includes(item)) return;
      if (disabled(item)) { event.preventDefault(); return; }
      const action = item.dataset.sfMenuItem;
      const requested = new CustomEvent('sf:menu-action', {
        bubbles: true, cancelable: true, detail: { action, item, trigger, menu: group }
      });
      const accepted = group.dispatchEvent(requested);
      if (!accepted) event.preventDefault();
      else if (local && localAction(action)) event.preventDefault();
      else if (item.matches('button')) status.textContent = 'action requested. no application handler is connected.';
      close(true);
    });
    if (local) resource.on(reset, 'click', () => {
      close();
      copies.forEach(copy => copy.remove());
      copies.clear();
      record.hidden = false;
      syncLocal();
      status.textContent = 'example list reset. nothing was sent or stored.';
    });
    resource.on(doc, 'pointerdown', event => {
      if (open && !panel.contains(event.target) && !trigger.contains(event.target)) close(panel.contains(doc.activeElement));
    });
    resource.on(doc, 'focusin', event => {
      if (open && !panel.contains(event.target) && !trigger.contains(event.target)) close();
    });
    resource.on(doc, 'keydown', event => {
      if (open && event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        close(true);
      }
    });
    resource.on(doc, 'sf:tabchange', position);
    resource.on(doc, 'scroll', position, { capture: true, passive: true });
    resource.on(view, 'resize', position, { passive: true });
    if (view.visualViewport) {
      resource.on(view.visualViewport, 'resize', position, { passive: true });
      resource.on(view.visualViewport, 'scroll', position, { passive: true });
    }
    if (native) resource.on(panel, 'toggle', event => {
      if (event.newState === 'closed' && open && !panel.matches(':popover-open')) close(panel.contains(doc.activeElement));
    });
  }

  function init(root = document) {
    // Cache authored source before IDs, hidden state or local example content change.
    if (window.SiftionUI?.source) all(root, '[data-sf-example]').forEach(example => window.SiftionUI.source(example));
    all(root, '[data-sf-tabs],[data-sf-menu]').forEach(group => {
      if (bindings.has(group)) return;
      const resource = binding(group);
      try {
        const result = group.matches('[data-sf-tabs]') ? setupTabs(group, resource) : setupMenu(group, resource);
        if (result === false) { resource.dispose(); return; }
        bindings.set(group, resource);
      } catch (error) {
        resource.dispose();
        console.warn('SiftionNavigation: setup failed.', group, error);
      }
    });
    return root;
  }
  function destroy(root = document) {
    bindings.forEach((resource, group) => {
      if (group !== root && !root.contains(group)) return;
      resource.dispose();
      bindings.delete(group);
    });
    return root;
  }
  window.SiftionNavigation = Object.freeze({ init, destroy });
})();
