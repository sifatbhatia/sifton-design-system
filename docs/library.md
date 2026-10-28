# Siftion UI

The existing `index.html` is the working showcase. Static HTML, CSS and JavaScript; no framework, remote fonts, or runtime dependencies. The initial theme is dark. A deliberate theme selection is stored locally and restores on reload.

## Design reference

The layout and control proportions are grounded in the actual Sifat portfolio at commit `3babd2b66149a1aa12626224c79a39167987fda2`. See `design-notes/portfolio-design-language.md` for the source analysis.

- Continuous dark presentation, an interactive specimen rail above the desktop wordmark, open ruled component rows, and a light closing panel.
- On mobile the wordmark comes first and the working specimens stack vertically.
- The rail expands the active specimen over 600 ms, coordinating neighboring widths. Hover and focus both expose this response; the examples are independently usable on touch.
- Compact 51px pill actions use 14px labels and 18px inline arrows, with a 4px arrow translation over 200 ms. No inset medallion, sweep fill, or hard offset shadow.
- The component index has nine tabs; implementation is collapsed by default. Copy is available without opening the source.
- `showcase.css` owns page presentation. `library.css` contains only reusable controls, rather than accumulated showcase overrides.
- The four approved Siftion UI 1.100 font files are unchanged. The four active palette colors and reserved violet token are unchanged.

## Reuse

```html
<link rel="stylesheet" href="styles/tokens.css">
<link rel="stylesheet" href="styles/components.css">
<link rel="stylesheet" href="styles/library.css">
<!-- Insert a copied example. -->
<script src="scripts/library.js"></script>
<script>SiftionUI.init(document);</script>
```

Keep the four font files in the sibling `assets/` directory; `styles/tokens.css` references them through `../assets/`. Copied examples do not require showcase CSS, showcase JavaScript, or the page's SVG sprite. Exported icons use inline text arrows.

`SiftionUI.init(root = document)` includes the root itself and initializes its descendants, returning the same root. Repeated initialization does not bind duplicate listeners. Give multiple instances unique IDs, label targets, ARIA references, and radio group names.

A component missing its required elements is left unbound and can be repaired and initialized later. An unexpected setup error is reported to the console without blocking sibling components.

For dynamically mounted content, call `SiftionUI.destroy(root)` before replacing or removing the subtree. It returns the root, removes owned listeners, cancels pending local-save timers and motion, restores temporary busy state, and closes an owned open modal. Native form values and disclosure state remain intact. A later `init(root)` can bind it again. Detached content can also be disposed through its retained root reference; teardown is explicit, not automatically observed.

```js
const panel = document.querySelector('#my-panel');
SiftionUI.init(panel);
// Before unmounting or replacing panel content:
SiftionUI.destroy(panel);
```

`SiftionUI.source(element)` returns trusted initial DOM, strips `sx-*` presentation classes, and replaces sprite dependencies. Choice and feedback exports reflect the current native selection. It is not a sanitizer for untrusted input. Source is assigned with `textContent` and user input is not injected as HTML.

## Actions

| Pattern | Classes | Response |
| --- | --- | --- |
| Primary | `sf-button sf-button--primary`, optional `sf-button__cap` | Filled pill; small inline arrow translates 4px on hover or focus |
| Secondary | `sf-button sf-button--secondary` | Neutral surface alternative; does not compete with the primary action |
| Text | `sf-button sf-button--ghost` | Plain text with underline emphasis |
| Icon | `sf-button sf-button--icon` | 46px circular target with explicit accessible name |
| Async demo | `sf-button sf-button--async`, `data-sf-async` | Busy/disabled for a 950ms local simulation, finite progress indicator, then replayable receipt |

Focus and hover share the same arrow treatment. Buttons do not move on hover; a press moves 1px. Reduced motion removes travel. Async save is a simulation, not persistence; replace its timer with a real operation and error handling before use in an application. User-entered casing is preserved.

## Surface and finishing details

Buttons use fine inset highlights and soft contact shadows, with an inset pressed state instead of an exaggerated lift. Switch tracks and text fields are recessed; switch thumbs and selected segmented options sit above those surfaces. Disclosures, dialogs, feedback, and motion controls share the same edge treatment. No gradients, oversized icon medallions, or hard offset shadows were added.

The masthead retains the requested `margin-top: -35px` and the three-column rail composition. Source formatting is not a visual approval or proof of rendered equivalence. The optional `scripts/check-final-polish.py` covers the offset, tactile states, field behavior, both themes, four widths, and reduced motion. Historical screenshots are under `verification/final-polish/`.

## Color roles

- Signal fills the primary action and enabled switch; selected chips, radio segments, and the active component index use the same color more sparingly. `sf-button--signal` is an explicit Signal-filled alias; use `sf-button--secondary` for the neutral surface alternative.
- Signal fill uses white text in both themes (`--sf-on-signal`). Text-only Signal uses `--sf-signal-text`, a lighter tint in night mode for readable small labels.
- Hot marks warnings, invalid fields, and the reversible removal action (`sf-button--caution`). Warning messages retain ink-colored copy over a restrained tint and Hot border. Small warning text uses a deeper Hot shade on Paper for contrast.
- Confirmations and waiting states remain neutral, with text and distinct marks. Hot never substitutes for a success color.
- Every base-color swatch and the large preview have a subtle 1px edge derived from their own foreground/background, so Paper on Paper and Ink on Ink remain visible. Swatch values are unchanged.
- An explicit preserved baseline can be compared with `scripts/check-color-polish.py --baseline PATH` or `SIFTION_COLOR_BASELINE`. Without a supplied baseline, hero comparisons are honestly skipped. These are source comparisons, including formatting differences, not rendered-equivalence checks.

## Form and non-button patterns

1. Validated field/local form: required title, inline invalid state, focus on invalid input, receipt and reset. Labels, help and error copy share a field container. `sf-field-group` and `sf-field-grid` group related controls; a native read-only destination remains focusable and selectable. Native select and optional resizable textarea retain their browser interaction model.
2. Feedback: saved, attention and waiting are expressed in text, not just color.
3. Segmented selection: native grouped radios and arrow-key navigation.
4. Switch: native checkbox with `role="switch"`, Space toggling and disabled state.
5. Choice chips: native independent checkboxes with selected checkmarks.
6. Disclosure: native `details`/`summary`, independently openable entries.
7. Modal: native `showModal()`, inert background, Tab/Shift+Tab wrapping, Escape, close and focus return.
8. Undo receipt: an open ruled document row with title/metadata, a quiet removal action, and a neutral removal receipt. Undo is the primary action in the receipt and remains available until restored or dismissed. Dismissal leaves the entry removed and exposes an empty state/reset action. The live status region sits outside hidden content so restoration and dismissal remain announced; all changes are local.
9. Content tabs and action menu: see [navigation.md](navigation.md) for independent styling, lifecycle, keyboard behavior, and real application callback hooks.

The component index retains buttons, inputs, feedback, choices, disclosure, dialog, undo, then adds tabs and action menu. Its sole controller is `SiftionNavigation`; nested content tabs do not change the outer source panel. The vertical index uses Up/Down, Home and End. Horizontal content tabs use Left/Right. Small screens retain a wrapping two-column index with vertical keyboard semantics. Without JavaScript every panel is authored visible; native choices and disclosures still work. Copied navigation snippets include their separate dependencies.

## Five motion recipes

| Recipe | Timing | Interrupt/reset | Reduced motion |
| --- | --- | --- | --- |
| Split/rejoin | 160 / 360 / 760ms | Reverse CSS transition or reset joined | Immediate state |
| Text reveal | 360ms | Cancel/replay or reset readable content | Readable final state |
| Editorial rows | 360ms + 70ms stagger; 500ms hover emphasis | Cancel/replay or reset list | Full list shown |
| Layout expansion | 360ms measured height | Reverse from current height; generation guard prevents stale completion | Immediate open/close |
| Action response | 200ms hover; 360ms replay | Cancel/replay/reset inline arrow and press | No travel |

Common easing: `cubic-bezier(.2,.8,.2,1)`. No endless animation or scroll-dependent hidden content. The split exercise is subordinate to the content examples. Reduced-motion changes finish active animations. Copy includes both the stage and its controls.

## Optional browser checks

Local preview: `http://127.0.0.1:4186/`, components: `http://127.0.0.1:4186/#components`.

```sh
python scripts/check-palette.py
uv run --with playwright python scripts/check-showcase.py
uv run --with playwright python scripts/check-library.py
uv run --with playwright python scripts/check-portfolio-finish.py
```

- Palette check verifies original font hashes, four active colors, removed acid and reserved violet.
- Showcase suite verifies four actual custom-font weights, editing and sizing, palette contrast, copying fallback, tabs, form behavior, motion, both themes, widths 320–1920, mobile navigation, persistence, reduced motion and no-JS content.
- Library suite verifies all seven panels, keyboard behavior, modal containment, undo, replay/reset/interruption, clipboard payloads, repeated scoped initialization and 16 standalone copied snippets. The existing hover/focus equality assertion remains intact; its report label now says inline arrow rather than cap.
- Portfolio-finish suite adds dark-default checks, closed source, measured coordinated rail expansion, control dimensions, vertical tab navigation, screenshots, reduced-motion rail behavior and brand-asset delivery.
- Reports: `verification/showcase/report.json`, `verification/library/report.json`, `verification/portfolio-finish/report.json`.
- Final composition captures: `verification/portfolio-finish/hero-{night,light}-{1440,390,320}.png`, `components-*`, `controls-*`, and full-page `page-*`.
- Standalone snippet inventory and test page: `verification/library/snippets.json` and `verification/library/reuse.html`. This is a verification artifact, not an alternate design proposal.

Backup before this finish: `backups/portfolio-finish-20260915-152211/`, including hashes of the four approved fonts.

The commands above are available for review on request, not automatically run after edits. Existing reports and screenshots are historical evidence for their producing revisions, not a passing result for the current working tree. The clipboard-success path in the library script is mocked to inspect the payload; it does not verify a system-clipboard write.

No public deployment, cross-browser certification, backend save, Git commit, reset or push is claimed.
