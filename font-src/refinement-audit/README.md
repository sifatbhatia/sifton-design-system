# approved-font refinement audit

## confirmed findings

`feature-audit.json` records a HarfBuzz comparison of default shaping against existing cv/zero features, restricted to cases with identical decomposed glyph outlines. the four inspected font hashes are recorded and were verified unchanged after the audit.

- 298 pair/feature/weight cases change advances or positioning without changing outlines: 70 in regular, 76 each in medium, semibold and bold. these are cases across weights, not 298 unique pairs.
- 24 combining-mark/feature/weight cases change mark offsets without changing outlines, six per weight.
- examples include `Tt`, `aV`, `aW`, `Ka`, `lt`, and `ff`. the largest recorded advance change is 209 font units for `Tt`.
- root cause: the builder promotes alternate outlines and horizontal metrics, but retains the original glyph-specific kerning and mark-positioning data. the same shapes can therefore behave differently depending on feature state.

## recommendation

1. migrate and reconcile kerning classes, explicit pairs, and mark anchors for the promoted defaults. do not blindly accept the alternate feature's spacing as the correct optical result.
2. visually tune crossbar-heavy and diagonal pairs at reading and display sizes. `Tt` and `aV` are visibly more open with alternate positioning, but the right side is not automatically better.
3. evaluate 12 and 14 px rendering across target browsers and pixel densities. the current 12 px `minimum`, `affiliation`, and `office` samples are relatively dense; 14 px is clearer. screenshot edge fringing cannot by itself distinguish hinting, rasterization, and capture effects.
4. retain the approved letterform direction. no concrete bowl failure, clipped accent, or reason for global word-space changes was established.

## evidence

- `inspection.html`: live diagnostic page, default and feature-on comparisons. no candidate font or replacement assets.
- `regular.png`, `bold.png`: fresh Chromium/Edge screenshots.
- `feature-audit.json`: full shaped glyph IDs, outline signatures, advances, offsets, and asset hashes.
- `scripts/audit-font-refinements.py` at the repository root: repeatable read-only audit.

preview: http://127.0.0.1:4186/font-src/refinement-audit/inspection.html

only audit artifacts were added. all four approved font binaries, the builder, and the showcase styles were left unchanged during this pass.
