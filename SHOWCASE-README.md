# Showcase guide

The showcase is the existing `index.html`, not an installable archive or separate application. See [README.md](README.md) for setup and [docs/library.md](docs/library.md) for reuse.

## Composition

- Dark-default page with an interactive three-column specimen rail above the desktop wordmark.
- Mobile moves the wordmark first and stacks the specimens vertically.
- Page shell: 1512px maximum. Shared layout token: 1440px maximum.
- Four fixed primitive-color swatches. Theme changes alter semantic surface and text colors, not the displayed primitive values.
- Nine component tabs with source collapsed by default, including reusable content tabs and an action menu.
- Five finite motion recipes with replay/reset and reduced-motion behavior.

## Ownership

`styles/showcase.css` owns page presentation. `scripts/showcase.js` owns specimens, theme, navigation, tabs, and copying. Reusable controls live in `styles/library.css`; reusable behavior lives in `scripts/library.js`.

The input panel includes a required title, grouped draft details, native select, a read-only destination, optional textarea, inline validation, and reset. The undo panel uses a ruled document row, persistent removal receipt, clear restore/dismiss actions, and an empty state after dismissal. Tabs and action-menu examples have standalone navigation dependencies. Save examples are local demonstrations. Clipboard denial opens a selectable-text dialog rather than claiming copying succeeded.

## Evidence

Historical reports and screenshots remain under `verification/`. They describe the versions that produced them. No archived count, screenshot, or report is a certification of the current working tree. Browser checks are available on request.
