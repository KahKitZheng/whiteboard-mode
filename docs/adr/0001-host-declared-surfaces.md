# Host-declared surfaces

Annotations must be scoped to the UI context they were drawn on — the page, an open popup, and the fullscreen view each hold their own. The host app declares these surfaces explicitly by mounting an annotation surface component with a stable id; the annotation layer renders into whatever surfaces are currently mounted rather than detecting them itself.

## Considered Options

Detecting surfaces automatically by watching the DOM for dialogs, top-layer changes and fullscreen transitions was rejected. It needs no host changes, but surface identity would depend on someone else's markup — a popup that renders slightly differently gets a different key and silently loses its annotations. Only the host app knows that a popup is "the media popup for lesson 3", and that identity is what we persist against.

## Consequences

Rendering each surface's layer *inside* the element it annotates means the browser's own stacking handles layering — a popup's annotations sit above the page's because the popup does. No z-index arithmetic, and the fullscreen top-layer case works by construction, since the layer is a descendant of the element that goes fullscreen.

The surface element also defines the coordinate origin and the width used for scaling, so no separate registration of bounds is needed.
