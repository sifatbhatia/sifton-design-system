# reusable navigation

compact navigation for content already on the page. tabs separate draft details; the action menu changes an explicitly local example list. these components use the existing paper, ink, signal, hot, type, border and motion tokens. they do not alter tokens or require a framework.

## dependencies and lifecycle

copied snippets **must load `styles/navigation.css` and `scripts/navigation.js`, then call `SiftionNavigation.init(root)`**. loading `library.js` or calling `SiftionUI.init(root)` alone does not activate these components. no showcase assets are required.

```html
<link rel="stylesheet" href="styles/tokens.css">
<link rel="stylesheet" href="styles/navigation.css">
<script src="scripts/navigation.js" defer></script>
<script defer src="scripts/start-navigation.js"></script>
```

in the consuming app's `start-navigation.js`:

```js
SiftionNavigation.init(document);
```

`start-navigation.js` is an integration example, not an included file. the token stylesheet loads the approved local fonts, so deploy its referenced `assets/` font files too. existing `components.css` and `library.css` may coexist but are not required by the standalone navigation examples.

public api:

- `window.SiftionNavigation.init(root = document)` includes a matching root and matching descendants. repeat calls do not add duplicate bindings. both functions return root.
- `window.SiftionNavigation.destroy(root = document)` removes listeners and binding records belonging to root and its descendants. it restores captured attributes and authored fallback states, closes an open menu, removes local copies and restores the original record. it leaves generated ids in place so re-init does not change relationships.
- before replacing a component's children or removing a component, destroy its owning root. then initialize the replacement. adding new components is supported through scoped init; editing the internals of an already bound component requires destroy/re-init.
- no automatic initialization or mutation observer is installed. destroy a detached component by passing that element, because `destroy(document)` cannot discover detached nodes.
- malformed/incomplete component markup is left unbound and remains retryable. each component owns its document/window/visual-viewport listeners and releases them on destroy.

## tabs hook contract

| hook | contract |
| --- | --- |
| `[data-sf-tabs]` | owning root, with exactly one directly owned tablist |
| `[data-sf-tablist]` | named tablist; set `aria-label` or `aria-labelledby` |
| `button[data-sf-tab]` | native button; provide `aria-controls` for an existing panel id |
| `[data-sf-tabpanel]` | corresponding panel within the same owning root |

all tablists, tabs and panels are filtered by `node.closest('[data-sf-tabs]') === owningRoot`. nested tab groups are separate bindings. a tab's `aria-controls` must identify exactly one directly owned panel; external panels are deliberately unsupported. keep ids unique across the document. alternatively, a nonempty `data-sf-tab="notes"` can pair with `data-sf-tabpanel="notes"` when `aria-controls` is absent; init generates stable ids and both aria relationships. empty hooks work with the existing id/aria-controls relationships on the showcase board.

the first enabled tab with `aria-selected="true"` is initially selected, otherwise the first enabled tab is used. only the selected button has `tabIndex=0`. inactive panels use the native `hidden` attribute. panels get `role="tabpanel"`, `aria-labelledby` and a default `tabIndex=0`. native disabled and `aria-disabled="true"` tabs are skipped and cannot activate.

selection is automatic on arrow-key focus movement. horizontal lists use left/right, respecting rtl direction; vertical lists use up/down. home/end select the first/last enabled tab. keys for the other orientation are not intercepted. the meaning of `aria-orientation` does not change because a list wraps into two columns. enter/space use native button activation.

on a changed selection, the owning root dispatches:

```js
new CustomEvent('sf:tabchange', {
  bubbles: true,
  detail: { tab, panel }
});
```

initialization does not dispatch this event, clicking the already selected tab does not dispatch it, and re-init installs the same event contract. no listener closes over the initial document's selection state.

**fallback:** author all panels without `hidden`. navigation css never hides them without initialization. all their content remains readable if javascript fails. destroy restores authored attributes, so an authored hidden panel will stay hidden after destroy. remove inherited `hidden` attributes when migrating the showcase.

## action-menu hook contract

| hook | contract |
| --- | --- |
| `[data-sf-menu]` | owning group; style with `.sf-menu` |
| `details[data-sf-menu-disclosure]` | native disclosure fallback inside group |
| `summary[data-sf-menu-trigger]` | direct summary child of disclosure; initializer adds `aria-expanded`, `aria-haspopup="menu"`, ids and controls |
| `[data-sf-menu-panel]` | action surface inside disclosure, with `.sf-menu__panel` |
| `button[data-sf-menu-item]` or `a[href][data-sf-menu-item]` | action value on the attribute; explicit `role="menuitem"` |
| `[data-sf-menu-status]` | required visible status region; receives `role="status"`, polite live region and atomic updates |

items and other menu hooks are filtered by `closest('[data-sf-menu]') === owningGroup`. one trigger/panel/disclosure per group is supported. menu items must belong to its action surface. no submenus are implemented.

init uses the native popover api where available, with `popover="manual"` for the top layer. the controller owns escape and outside dismissal consistently across native and fallback paths. otherwise it uses a fixed surface and native hidden state. do **not** author `popover` or `hidden` on the panel: that would make the disclosure fallback inaccessible in supporting browsers when javascript is absent. omit authored `aria-expanded` on the summary so native disclosure state remains accurate without javascript; init supplies it.

click or enter/space opens the menu; up/down on its trigger opens at the last/first enabled item. up/down, home/end browse available actions. disabled actions stay visible but are skipped; `disabled` and `aria-disabled="true"` are both supported. enter/space activates buttons; space also activates native links. escape and action activation close and return focus to the trigger. tab/shift-tab close without trapping focus, continuing from the trigger. pointer dismissal does not cancel the outside target's interaction. moving focus outside closes the menu. switching an owning tab also closes a menu whose trigger becomes hidden.

the small positioning function measures the trigger and surface, flips above when needed, clamps to a 12px viewport margin and caps surface size. it listens to scrolling, resizing and visual-viewport changes. long menus scroll. css uses the existing type/surface tokens, fine borders and minimum 44px targets, with no transitions under reduced motion.

### local example actions

`data-sf-menu-local` explicitly opts into a DOM-only example. without this opt-in there is no built-in mutation or pretend save. the local example also requires:

- `[data-sf-menu-list]`: list container.
- `[data-sf-menu-record]`: original plain-text record inside that list.
- `[data-sf-menu-record-title]`: text label inside the original.
- `[data-sf-menu-reset]`: native reset-example button.

local action values are `duplicate`, `archive`, and `restore`. duplicate adds a real copy of the original row; archive hides the original; restore reveals it. duplicates remain when the original is archived. actions affecting an archived original become disabled until restoration. reset removes only copies created by this instance and restores the original. accessible status describes the actual local change and lack of persistence. the record contract is plain text with no embedded controls, label references or nested components.

### production callbacks and links

activation dispatches a bubbling, cancelable `sf:menu-action` event from the owning group with `detail: { action, item, trigger, menu }`. it dispatches before local defaults or native link navigation. prevent default to supply an application callback, suppress local mutation, or override link navigation. the menu then closes and returns focus. the handler owns success/failure status and any real persistence.

```js
menu.addEventListener('sf:menu-action', event => {
  if (event.target !== menu) return;
  if (event.detail.action !== 'duplicate') return;
  event.preventDefault();
  // invoke the application's real callback here and update its status
});
```

for a genuine navigation action, use `<a href="/drafts/spacing" role="menuitem" data-sf-menu-item="open">open draft</a>`. do not copy that illustrative route unless it exists in your application. a button with no callback only reports that an action was requested, never that a save/clipboard/persistence operation succeeded. no storage, network or clipboard access occurs in this script.

## showcase and source-export integration

the existing showcase integrates both components. its main component board uses the reusable controller, while the nested content-tab example owns a separate selection. the source panel listens only to the main board. the following contract also applies when integrating navigation into another page.

1. add `navigation.css` after the existing library styles and load `navigation.js` before the consuming showcase initializer.
2. set `data-sf-tabs` on the main component board, `data-sf-tablist` on its `.sx-tabs`, `data-sf-tab` on the existing `[data-tab]` buttons, and `data-sf-tabpanel` on `.sx-tab-panel` panels. preserve each id, controls, label relationship and `data-tab` value.
3. remove the old showcase tab click/keydown controller entirely, including its broad `$$('[data-tab]')` lookup and selection/hidden-state writes. do not leave two controllers on the same board. the main list remains `aria-orientation="vertical"`; preserve up/down semantics even in its narrow two-column layout. the reusable stylesheet does not restyle `.sx-tabs` or the hero.
4. listen for `sf:tabchange` on the main board and ignore nested events with `if (event.target !== board) return;`. derive the snippet key from `event.detail.tab.dataset.tab`, then update the code panel. initialize the source code panel's default snippet separately because init emits no selection event.
5. snapshot `SiftionUI.source(example)` for every `[data-sf-example]` **before** `SiftionNavigation.init(document)`. that preserves authored fallback visibility, initial disabled states and the original local list. navigation init also calls this optional source api before it mutates any component, but explicit showcase snapshot order remains the primary contract.
6. register source labels for the new tabs and menu panels, and prepend a dependency note naming `navigation.css`, `navigation.js` and `SiftionNavigation.init(root)` to their copied snippets. do not reuse the old library-only dependency note. no `sx-` class, sprite or showcase controller is needed by the provided examples.
7. if library behavior is present in the same application, initialize it separately with `SiftionUI.init(root)`. source export uses `library.js`; navigation runtime itself does not depend on it.

the `tabs` and `action menu` panels in `index.html` contain complete examples. use their source-copy control to obtain authored markup plus the relevant dependency note.

## remaining limits

- only javascript syntax is checked in this task; visual fit and interaction review remain with the user. no browser walkthrough or test suite was run.
- the fallback fixed menu should not be placed inside transformed/filter/contain ancestors that establish a fixed containing block or clipping context. native popovers avoid that limitation through the top layer.
- there is no typeahead, submenu, focus trap, persistence, history navigation or runtime dependency. local duplicates have no durable identifiers.
- changing tabs/panels/items inside an existing binding requires scoped destroy/re-init. supplying duplicate authored ids is the consuming application's responsibility.
- without javascript tabs are readable sections and the menu is a native disclosure; local list mutations and enhanced menu keyboard navigation require initialization.
