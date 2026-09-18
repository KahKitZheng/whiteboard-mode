# The annotation layer is one OpenSeadragon overlay

A boardbook's background image is rendered by OpenSeadragon, and its annotation layer is a single OSD overlay the size of the whole image, holding an `<svg viewBox="0 0 imgW imgH">`. OSD positions and sizes that one element every frame; the browser scales its contents. Shapes are laid out once, in image pixels, and nothing in the annotation module knows the zoom.

## Considered Options

**Transforming shapes ourselves** — reading OSD's zoom and pan each frame and mapping every shape's coordinates to the screen — is what app-react does (`useShapeScaling.ts`, 336 lines, plus a per-marker `requestAnimationFrame` loop). It was rejected: OSD already computes exactly that transform for overlays, and asking it for one rectangle is the whole job.

**Rendering the image with `<img>` and a CSS transform**, as app-react does, was rejected in favour of OSD for sharpness at zoom and a fast first paint. A `{ type: 'image', url }` tile source kept the pipeline trivial at first; the fixture page is now a `.dzi` pyramid (`npm run tiles`), and a plain image URL still opens the same way — no change to this decision.

## Consequences

`AnnotationSurface` gained a `viewBox` prop. With it, shapes render into SVG user units of that size instead of the surface's measured pixel width, and pointer input is scaled by the box the event arrived in (`getBoundingClientRect().width`) rather than the measured width. The two only coincide without a viewBox. The round trip is exact because `offset · imgW/boxW · ref/imgW = offset · ref/boxW`.

`AnnotationSurface` also gained `inkScale`, a getter read as a shape is created. Weight and text size are divided by the current zoom over home zoom, so ink drawn while zoomed in reads at the pen's weight and then shrinks with the image — app-react's `creationZoom` meta as one division. A getter rather than a value, because a zoom animation may be mid-flight when the pen lands.

Markers and focus areas are children of that same surface, placed by percentage of the image box — the box *is* the image, so the authored percentages apply directly, as they do in app-react. A marker's size is in pixels, computed from its percentage at home zoom, so it keeps its screen size while the box scales around it — app-react's net behaviour without its per-frame counter-scale. A focus area's size is a percentage too, so it scales with the region it outlines; its CSS border stays put, because OSD positions the overlay with `left/top/width/height` in pixels rather than a scale transform.

*Amended for ADR 0006:* they were first built as OSD overlays of their own (point overlays for markers, rect for areas). They moved into the surface so a press on them is visible to it as a target.

The overlay lives inside OSD's canvas element, whose tracker captures the pointer on any press, so the browser delivers the click to the canvas rather than to a marker or an area pressed. Off, the press reaches the tracker all the same — a drag from an area has to pan, and areas cover most of the page — and the control pressed is clicked when OSD calls the release a click (`canvas-click` with `quick`). *Amended:* the press was first stopped short of the tracker, which made most of the page undraggable. (ADR 0006 has the armed side.) Armed, `setMouseNavEnabled(false)` switches the tracker off altogether and the surface takes every press — a tap on a control stays the control's (ADR 0006), everything else draws. Navigation while armed goes through the chrome as well: the walkthrough and the zoom buttons.

Off, the page pans and zooms freely but never leaves its box: it covers the view at every zoom (`visibilityRatio: 1`), a drag stops at its edge instead of bouncing back (`constrainDuringPan`), the minimum zoom is the fit, and a drag is allowed only along an axis the page overflows — all re-read after every zoom and resize (`keepInBox`). Fitted, a drag therefore moves nothing.

Hit tolerance (`hit.ts`) and selection handle size (`Selection.tsx`) are in reference units, so both grow with zoom. Known, not yet addressed.
