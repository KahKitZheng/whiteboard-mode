# Boardbook in whiteboard-mode — implementation plan

Recreate app-react's `boardbook` assignment viewer inside this repo, annotatable by the
existing whiteboard layer. Viewer only — no editor. Data prefilled from a hardcoded
fixture shaped exactly like `AssignmentBoardBookEntity`.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | OpenSeadragon renders the image, not `<img>` + CSS transform | Sharpness and fast first paint; deep zoom available later without a rewrite |
| 2 | Annotation layer is **one OSD overlay** holding an `<svg viewBox="0 0 imgW imgH">` | OSD positions and sizes it every frame, the browser scales the contents. No transform maths, no per-shape work — the thing `useShapeScaling.ts` needed 336 lines for |
| 3 | Free pan/zoom within the page's box — it covers the view at every zoom and never shrinks below the fit; focus areas are `fitBounds` shortcuts | Beyond app-react, which only zooms into authored areas at 1.2–2.5x. _Amended:_ the edge constraint, so the page cannot be dragged out of view or zoomed out past the fit. Wheel pans and ctrl+wheel (a trackpad pinch) zooms, Figma-style |
| 4 | Armed ⇒ `setMouseNavEnabled(false)`, layer takes every pointer | No gesture arbitration. Navigation while armed goes through chrome (zoom buttons, walkthrough); the navigator minimap was dropped |
| 5 | ~~Armed ⇒ markers and focus areas are `pointer-events: none`~~ Armed ⇒ a *tap* on a marker or area is still its own; a *drag* draws | Superseded by ADR 0006. Parity with app-react was the first build; a teacher shouldn't have to disarm to press a marker |
| 6 | Stroke weight and text size are divided by the zoom ratio at creation | Ink reads as drawn, then stays anchored to the image. app-react's `creationZoom` meta as one line |
| 7 | Markers are ~~**Point** overlays (`CENTER`)~~ children of the surface at `left/top: %`, fixed CSS size | Constant screen size while zoomed, authored size at home zoom — app-react's net behaviour without its per-item `requestAnimationFrame` loop. _Moved into the surface_ so a press on one is a target the surface can see (ADR 0006) |
| 8 | Focus areas are ~~**Rect** overlays~~ children of the surface at `left/top/width/height: %`, persistently outlined and numbered, ordered walkthrough | Anchored to the image and scale with it. Same move as 7. `order` is what the CMS numbers them by and defaults `name` to |
| 9 | `item.text` rendered by a ~40-line recursive TipTap-JSON renderer | Read-only viewer; avoids ProseMirror in an 8-dependency repo |
| 10 | ~~Tile source is `{ type: 'image', url }`~~ The fixture page is a `.dzi` pyramid of lossless WebP tiles; a plain image URL still works | _Superseded._ One flat image is only ever as sharp as its own pixels, and OSD rasterises an SVG once at its declared size. `npm run tiles` (`scripts/generate-tiles.mjs`, sharp) cuts a page into `public/boardbook/tiles/`, gitignored — run it once after cloning. Lifted from deep-zoom-image-poc |
| 11 | `AnnotationSurface` gains two optional props: `viewBox` and `inkScale` | Existing surfaces unchanged; module stays generic. _Built as_ one `viewBox: {width, height}` (render width is its width — two coupled props invited a mismatch) plus an `inkScale()` getter for decision 6 |
| 12 | Scope: `images.background` + `items` + `focusAreas` | `answers`, hover popovers, Immersive Reader and audio are out (types kept) |
| 13 | New `/boardbook/:slug` route; lesson demo stays | Two host contexts over one annotation module keeps the module honest |
| 14 | The page's text is data, laid invisibly over the picture (`TextLayer.tsx`) | Marks snap to a boardbook's words (ADR 0008) without a second renderer next to OSD. Positioned in `%` and `cqw`, so it scales with the box like the markers. A PDF upload would supply it via pdf.js `getTextContent`; `npm run text` reads it off the fixture SVG meanwhile. No text layer, or a scan without one → the highlighter is ink, as over any picture |

## Coordinate chain

Boardbook data is percentages of the image box (`.assignmentBox` is `inline-block` around
the image, so `%` maps straight to image pixels):

```
item.x%  ->  imageX = x / 100 * imgW
item.y%  ->  imageY = y / 100 * imgH
```

Annotation shapes stay in the existing 1280 reference space. `storage.ts`, `style.ts`,
`hit.ts`, `geometry.ts` and `ShapeView` need **no change**:

```
render:   ShapeView(shape, renderWidth = imgW)   -> viewBox units
pointer:  toReference(offset, box.width)         -> reference units
```

`width` currently does both jobs. Splitting it is the whole API change:

```
scale for rendering  = renderWidth ?? measuredWidth
scale for pointers   = getBoundingClientRect().width   (already what pointFrom reads)
```

Round-trip is exact because `offset * imgW/box.width * 1280/imgW == offset * 1280/box.width`.

## Files

```
src/annotation/AnnotationSurface.tsx   + viewBox, + inkScale
src/boardbook/
  BoardBook.tsx        OSD viewer, overlays, arm/disarm mouse nav
  BoardBookItem.tsx    marker (Point overlay) + non-modal dialog surface
  FocusAreas.tsx       Rect overlay button + the walkthrough/zoom bar
  walkthrough.ts       byOrder, neighbour (was going to be focusAreas.ts — clashes with FocusAreas.tsx on a case-insensitive disk)
  richText.tsx         TipTap JSON -> React
  icons.ts             itemIcon key -> character or lucide glyph
  coords.ts            percent <-> image px, fitWidth, zoomRatio
  types.ts             AssignmentBoardBookEntity & co, field for field
  fixtures.ts          the prefilled AssignmentBoardBookEntity
public/boardbook/      the page image and an item figure, as SVG
docs/adr/0005-osd-overlay-annotation-layer.md
CONTEXT.md             + boardbook terms
```

## Surfaces

| Surface | id | Coordinate space |
|---|---|---|
| The image | `boardbook-<assignmentId>` | reference space, rendered into the image viewBox |
| An item dialog | `boardbook-<assignmentId>:item-<itemId>` | reference space, measured width (ADR 0004: non-modal, spans viewport) |

Focus areas are **not** surfaces — they move the camera, they do not own annotations.
This matches app-react, where shapes carry a `popupId` and never a focus-area id.

## Tests

Mirroring app-react's harness: vitest + RTL for units, Playwright for behaviour.

**New dev deps**: `jsdom`, `@testing-library/react`, `@testing-library/user-event`,
`@testing-library/jest-dom`, `@playwright/test`. No MSW — there is no API to mock.

**vitest** (`vite.config.ts`): `environment: 'jsdom'`, `globals: true`,
`setupFiles: ['src/setupTests.ts']`, `exclude: [...configDefaults.exclude, 'e2e/**']`,
`css: false`.

Unit tests:
- `percentToImage` / `imageToPercent` round-trip
- `normalizeWeight(weight, k, kHome)` at several zoom ratios
- pointer `offset -> reference` round-trip across zoom levels
- the TipTap-JSON renderer: every node and mark type, plus an unknown node type
- `focusAreas` ordering and walkthrough stepping

**Playwright** (`playwright.config.ts` + `e2e/test.ts`): specs import `test`/`expect` from
`e2e/test.ts`, never `@playwright/test`. The auto fixture records and aborts any request
leaving localhost and fails at teardown, so a leaked external image surfaces as a failure
rather than a flake. Background image served from `public/` for determinism.

E2E specs:
- draw at home zoom, zoom into a focus area, assert the stroke lands on the same image pixels
- draw while zoomed, zoom out, assert the stroke is still anchored and thinner
- open an item dialog, draw in it, close and reopen — the dialog's marks come back and the
  image's marks were never touched
- armed: pressing a marker draws instead of opening the dialog
- walkthrough prev/next steps through areas by `order`

## Known risks, to verify rather than assume

1. **OSD overlay sub-pixel drift.** OSD repositions overlays per animation frame; ink may
   shimmer a fraction of a pixel against the image mid-zoom. Needs looking at on a real board.
2. **`hit.ts` TOLERANCE = 12 is in reference units**, so select/erase tolerance grows with
   zoom — 12 reference units is ~48 screen px at 4x. Probably wants dividing by the zoom ratio.
3. **`Selection.tsx` handle size** is likewise in reference units, so handles grow with zoom.
   Same fix, same place.
4. **`kHome` changes on container resize**, so the creation-zoom ratio must be recomputed
   rather than captured once.
5. ~~**Focus-area outlines scale with zoom**~~ — they don't. OSD positions overlays with
   `left/top/width/height` in px, no scale transform (`Overlay.drawHTML`), so a CSS border
   stays put. Verified in the source, then on screen.
