# Siftion UI showcase redesign

## Install

Merge the contents of this archive into the existing `sifatbhatia/sifton-design-system` repository. Replace only `index.html`; merge the `styles` and `scripts` folders rather than replacing entire directories.

The three implementation files are:

```text
index.html                 Replaces the showcase page
styles/showcase.css        Adds the isolated presentation layer
scripts/showcase.js        Adds the interactive examples
```

Keep the existing `styles/tokens.css`, `styles/components.css`, `tokens.json`, and `assets/` directory. They are dependencies, not replacements, and are intentionally not included in this archive. No font files are included.

Serve the existing repository with any static development server. There is no install or build step, no framework, and no additional runtime package dependency.

## Design

The living specimen: a large typographic masthead, an asymmetric strip of working examples, an editable type specimen, a palette shown in context, real component markup, and a press-driven motion experiment. No automatic marquees, scroll-hijacking, decorative gradients, or hidden-until-scrolled content.

The showcase shell is capped at 1650px. This is a page-level composition decision; the original system's 1440px token remains unchanged. The original Siftion UI family and its four existing font weights are referenced through `styles/tokens.css`.

## File ownership

- `index.html` owns semantic content, navigation, original stylesheet imports, the SVG symbol sprite, example markup, and a small pre-paint theme initializer.
- `styles/showcase.css` owns the `sx-` presentation namespace, responsive composition, page-specific contrast corrections, and reduced-motion behavior. Desktop, tablet, and mobile use separate arrangements rather than simply shrinking the desktop page.
- `scripts/showcase.js` owns local interaction state: theme selection, mobile navigation, type controls, color previews, clipboard fallback, component tabs, local example validation, and motion controls.

## Interactions

The hero has four font-weight options, a reversible geometric composition, and a button with immediate feedback. The type specimen supports editing, all four font weights, a responsive size slider, and a reset. The six base color swatches update the composition, CSS token, and computed preview text contrast. Copy buttons use the Clipboard API when allowed and a selectable-text dialog when it is unavailable.

Component tabs support Left/Right, Home/End, and normal keyboard activation. Button examples expose their corresponding markup. The input example validates and saves only in page memory. Feedback states pair text with their indicator colors. The motion demo uses the original 160ms, 360ms, and 760ms tokens and resolves immediately when reduced motion is requested.

Only theme preference is stored in localStorage. Form examples are not transmitted or persisted. JavaScript adds no external services, analytics, or network requests.

## Contrast corrections

The shared library files are unchanged. This page adds narrowly scoped presentation corrections:

- White text over the blue signal background, with dark text restored over the orange hover state.
- A page-only derived muted color with more contrast on paper and raised panels.
- Explicit focus outlines and a higher-contrast focused field label.

The color preview pairs its background with readable text and reports that specific pair's contrast. It does not claim every existing system color combination meets accessibility requirements. The displayed swatches are the original light-mode primitives; switching the page theme does not relabel or replace them.

## Validation

79 layout and interaction checks passed in Chromium. Responsive checks covered 320, 360, 390, 540, 767, 768, 1024, 1100, 1101, 1440, 1920, and 2560px. All widths stayed within the viewport, and the main content shells stayed within the 1650px cap.

Checks included theme states, type editing and reset, all six color selections, manual clipboard fallback, restored dialog focus, keyboard-controlled tabs, form validation and safe text rendering, feedback states, motion durations, reduced motion, mobile navigation, internal links, SVG references, and ARIA references. No JavaScript exceptions occurred during those checks.

A separate steady-state visible-text contrast check found no failures across the three component tabs in both themes. This is a targeted check, not a complete WCAG certification.

### Testing limitations

The original binary fonts were not available to the rendering environment. Screenshots and the standalone preview therefore use the declared system fallback. The drop-in files retain the original Siftion UI font references. Review the typography once more with your actual `assets/` files loaded.

Browser navigation was restricted in the rendering environment. Tests loaded the exact CSS and JavaScript inline rather than visiting a deployed server. Live font loading, clipboard permission success, persistent storage across real-origin reloads, Safari, and Firefox were not tested. Clipboard denial and unavailable storage were handled and tested.

## Original source integrity

The local reference copies used for integration matched these Git blob hashes from the repository:

```text
tokens.css      2062ae76ee6300a47b8010cc624aa1eda15ce7c5
components.css  89f1f01676340c0f3e2e156828a7d6c23e048fbe
tokens.json     6f720a570804ffde17a37b24bd66317af777e3d8
```

These reference files are not bundled because installation should continue to use the originals in your repository.
