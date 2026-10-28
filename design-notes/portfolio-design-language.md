# portfolio design-language analysis

## inspected reference

repository: https://github.com/sifatbhatia/sifat-portfolio-nextjs
commit: `3babd2b66149a1aa12626224c79a39167987fda2`
local clone: `C:/Users/sifat/AppData/Local/Temp/sifat-portfolio-design-reference`
running reference: http://127.0.0.1:4187/

cloned the repository afresh with `--no-checkout`, then checked out 93 valid files. the only skipped entry was Windows metadata `public/assets/Siftion.svg:Zone.Identifier`, which cannot be checked out as an ordinary Windows filename. no design source was replaced. installed from package-lock with npm ci and ran the actual Next.js app. home, projects, services, and the J. Worra case study returned 200. inspected fresh desktop/mobile screenshots and exercised carousel, selected-project hover, and the expanding menu. screenshots and measurements are in the clone's `analysis/` directory.

this analysis supersedes the previous generic component direction. it is not a claim that the current Siftion design-system page has been corrected or approved. no font changes are authorized.

## actual language

### 1. dark continuity with a deliberate light break

`src/app/globals.css` establishes a warm charcoal page `#141412`, warm ivory `#f1eee7`, closely related raised surfaces, low-opacity rules, and a restrained muted sage accent. the home page keeps that dark continuity through work, about, services, and journal; `CTA.tsx` creates a substantial ivory contact section. it does not alternate bright specimen cards or give every component its own contrasting box.

for Siftion UI, retain the approved font and removed-acid decision. the reference's palette relationships matter more than mechanically importing its sage accent over the already simplified palette.

### 2. identity at architectural scale, controls at human scale

`Hero.tsx` places actual project previews above a viewport-wide SVG wordmark. on desktop the work strip, a right-aligned sentence, and huge bottom wordmark have different alignments. empty upper space establishes pacing. the wordmark is not a generic section heading repeated throughout the page.

`CTA.tsx` uses compact pill controls around 51px high, 200px minimum width, .9rem text, and small inline arrows. they are subordinate to the large headline and invitation. the prior assertion that pill geometry itself was the problem was wrong. exaggerated arrow medallions, inset frames, toy shadows, and several competing shapes were inventions, not traits taken from this portfolio.

### 3. hierarchy relies on contrasting typographic roles

`layout.tsx` loads Young Serif for display and Inter for body. serif headings carry the human/editorial voice; small sans labels, practical body text, and the bespoke SVG wordmark have separate jobs. headings are sentence case, while navigation and metadata use small tracked uppercase. the source is not an all-lowercase mono-label system.

Siftion UI remains the approved font. its display/body contrast must come through deliberate scale, weight, line height, width, and spacing. do not silently substitute the portfolio's Inter or Young Serif into this project. equally, retaining one font is not a reason to flatten every role into identical small sans text.

### 4. projects and services form open editorial rows

`SelectedWork.tsx` uses a narrow offset index, a wide title/description column, and a smaller image column. `src/app/services/page.tsx` presents title/description and service details in open ruled rows. the content is not enclosed in repeated rounded cards. thin rules, staggered alignments, constrained reading widths, and generous row spacing do the grouping.

there are rounded surfaces where they have a role: images, the floating menu, some supporting service elements, and contact controls. a blanket ban on rounded corners or making all controls square would be another unsupported assumption.

### 5. motion shifts attention between content

source and live evidence:

- hero carousel: hovered item's width measured from 259.1875px to 349.90625px at a 1440px viewport. source uses a 1.35 width multiplier and 600ms width transition. neighboring previews participate in the changing composition.
- selected project: live resting media opacity .58; hover opacity 1 with a -4px lift. image filter changes from grayscale(.55), contrast(.82), brightness(.58) to grayscale(.12), contrast(.95), brightness(.86). source uses 500ms frame transitions and 900ms image transitions.
- hero wordmark: source animates letters into place with stagger, then displaces them with scroll. it is coordinated with the work strip rather than an unrelated demonstration.
- text: `AnimatedText.tsx` uses clipped character/word movement and .5–.8 second arrivals, with .02/.06 stagger and eased settling.
- contact controls: 200ms surface/lift response and a modest 4px arrow movement. not every button has its own effect.

principle: interaction changes the prominence, proximity, or visibility of real content. the previous split-circle notebook did not explain how the portfolio itself behaves.

### 6. navigation is compact and spatially anchored

`Navbar.tsx` starts with a signature and understated text links. as the page scrolls, that header recedes and the top-right nine-dot control appears. opening expands an 88px shell to a roughly 260px menu, first in width, then height, with links entering after the shell. the surface is translucent charcoal, an 18px radius, a fine border, and backdrop blur. the dots morph rather than being replaced with a generic close icon.

the source itself contains recognizable component candidates: expanding navigation shell, coordinated image row, compact contact action with a copied receipt, responsive project rail, and restrained text entrance. these should anchor a library representing this site before generic preferences panels do.

### 7. mobile is recomposed

source plus fresh rendering show the wordmark moves before the project rail, the rail becomes a vertical stack, and desktop links give way to the dot menu. the project-row image moves above its text. this is a different composition, not simply a miniature desktop frame with wrapped tabs.

### 8. copy carries personal context

headings such as “Things I'm proud of.” and “I build for people who care.” describe a person and their work. service paragraphs explain audience and deliverables. the contact section asks for a short note about what is being made and what remains unresolved.

previous copy such as “one label. one direction.”, “a quieter invitation.” and “take the parts. keep your voice.” narrated design choices without giving useful context. do not imitate the reference by adding more poetic slogans; use concrete examples from the actual component's job.

## why the design-system attempts missed

- extracted superficial ingredients (large lowercase text, hairline borders, orange accent) while missing dark continuity, imagery, typographic role contrast, and pacing.
- made the component catalog and code panel the composition instead of demonstrating how controls fit into content.
- treated each button as an independent visual trick rather than a small member of one controlled family.
- replaced real portfolio behavior with generic field/settings/save examples and a shape playground.
- responded to rejection by inventing another side page instead of redesigning the requested `index.html#components` route.
- used functional checks as evidence of visual fit. passing behavior tests does not establish the user's aesthetic approval.

## constraints for the next implementation

- work in the existing `index.html`, including its `#components` section. no unsolicited replacement route.
- preserve every approved Siftion UI font binary byte-for-byte.
- use the actual portfolio's proportions, surfaces, composition, and coordinated response as the baseline, not a collection of internet button effects.
- prioritize component examples drawn from its real navigation, work rows, actions, disclosure, and feedback.
- keep reusable source available without letting it dominate the visual surface.
- verify responsive/keyboard/reduced-motion behavior, then separately review visual fidelity against the rendered reference.

## limitations

this is a read/render analysis, not a cross-browser certification or a dependency audit. npm ci reported dependency vulnerabilities; no automatic updates were made to change the reference. the analysis phase froze design-system edits. the subsequent in-place implementation is now recorded in `verification/portfolio-finish/`, with fresh parent-run palette, showcase, library, and composition checks. the approved font hashes remain unchanged.
