# Reference-width normalized coordinates

Shape coordinates are stored against a fixed reference width rather than in raw pixels, and scaled on render by `surfaceWidth / referenceWidth`. This keeps annotations correctly placed across board resolutions without storing pixels against a display size.

**Amended after implementation:** this decision originally said scrolling would be handled separately, by translating the layer. It is not handled at all. Because the layer renders inside the surface element (ADR 0001), the browser scrolls it with the content — verified in #1, where a 194px page scroll moved the stroke exactly 194px. Coordinates are surface-relative, so scroll never enters the transform.

## Consequences

The host app's layout reflows — text rewraps at different widths — so scaling places a shape at the same *relative* position, not necessarily over the same *content*. An annotation circling a word will drift off it if the surface is resized after the annotation was made.

*Superseded by ADR 0007:* shapes now anchor to the content under them, and reference-width placement is the fallback for a shape over nothing. The rest of this section records the original reasoning.

This was accepted. Target devices are fixed-resolution school panels running fullscreen, where the scale factor never changes during a lesson. The broken case is a developer resizing a browser window.

The alternative that would survive reflow honestly is anchoring shapes to DOM elements (`{selector, dx, dy}`), which costs element identity, unmount handling and a resolution step on load. That is the upgrade path if reflow-mismatch turns out to bite real users.

The stored payload carries its `refWidth`, so a later change of reference width is a migration rather than a silent corruption.
