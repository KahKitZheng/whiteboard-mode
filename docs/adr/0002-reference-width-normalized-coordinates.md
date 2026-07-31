# Reference-width normalized coordinates

Shape coordinates are stored against a fixed reference width rather than in raw pixels, and scaled on render by `surfaceWidth / referenceWidth`. Scrolling is handled separately, by translating the layer. This keeps annotations correctly placed across board resolutions without storing pixels against a display size.

## Consequences

The host app's layout reflows — text rewraps at different widths — so scaling places a shape at the same *relative* position, not necessarily over the same *content*. An annotation circling a word will drift off it if the surface is resized after the annotation was made.

This is accepted. Target devices are fixed-resolution school panels running fullscreen, where the scale factor never changes during a lesson. The broken case is a developer resizing a browser window.

The alternative that would survive reflow honestly is anchoring shapes to DOM elements (`{selector, dx, dy}`), which costs element identity, unmount handling and a resolution step on load. That is the upgrade path if reflow-mismatch turns out to bite real users.

The stored payload carries its `refWidth`, so a later change of reference width is a migration rather than a silent corruption.
