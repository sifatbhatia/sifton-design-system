# siftion ui 1.100

this revision rebuilds the four original files in `assets/`. it does not use the separate siftion sans font or any external replacement family.

## design changes

- single-storey `a`, including the family's supported accented forms.
- right-facing crossbars on `f` and `t`, reducing congestion in combinations such as `ft`.
- tailed lowercase `l` and barred capital `I`.
- alternate proportional `1`, flat-top `3`, and open `4`. the tabular `1` retains its wider foot for numeric alignment.
- newly drawn, softly rectangular `o`, `O`, and zero bowls. each weight retains its own original bounds, overshoot, stem thickness, and counter dimensions.
- slashed zero across proportional, tabular, superscript, subscript, numerator, and denominator forms. the slash is joined to the bowl rather than cutting seams into it.

these are default outlines in the binaries, not CSS feature toggles. the alternate letters are derived from the existing font's own OpenType alternates; the new bowls and zero slash are programmatically drawn. this remains an **Inter-derived family**, not a claim of an entirely original alphabet.

## scope and preservation

all four weights retain 2,937 glyphs and the same 2,852 mapped codepoints as their corresponding baseline. each has 305 changed decomposed outlines, including dependent accented and composite forms. glyph order, character mapping, and the existing OpenType layout tables are retained.

obsolete TrueType instructions were removed throughout the family so old point-index instructions cannot act on rebuilt outlines or composites. current Chromium rendering was checked at reading sizes; this is not a new hand-hinting pass or exhaustive cross-platform type QA.

font family, full name, unique ID, PostScript name, and version now identify the Siftion UI revision. upstream copyright, designer credit, and OFL license information are preserved. `assets/OFL.txt` contains the full upstream license.

## reproducible build

run from the repository root:

```bash
uv run --with fonttools==4.65.0 --with brotli==1.2.0 --with skia-pathops==0.9.2 python scripts/build-fonts.py
uv run --with fonttools==4.65.0 --with brotli==1.2.0 python scripts/check-fonts.py
```

`baseline/` contains byte-for-byte copies of the original assets. the builder always starts there, so rerunning it does not apply edits cumulatively. `build-report.json` records source/output SHA-256 values, promoted alternates, and every changed glyph.

## browser proof

```bash
python -m http.server 4186 --bind 127.0.0.1
```

- design system: `http://127.0.0.1:4186/`
- side-by-side proof: `http://127.0.0.1:4186/font-proof.html`

in another terminal:

```bash
uv run --with playwright python scripts/check-fonts-browser.py
```

this verifier uses the locally installed Microsoft Edge executable. it checks actual platform-font selection for all four weights, font downloads, specimen controls, and viewport overflow at 1440, 390, and 320 px. screenshots and JSON results live in `verification/`. HarfBuzz shaping checks also passed for tabular spacing, accented text, canonical accent equivalence, ligature strings, and currency samples across the four weights; their recorded result is `verification/shaping-report.json`.

font URLs in `styles/tokens.css` carry `?v=1.100` so an earlier cached font does not hide the new files. the showcase composition is unchanged.
