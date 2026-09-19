# Host-declared surfaces

Annotations must be scoped to the UI context they were drawn on — the page, an open popup, and the fullscreen view each hold their own. The host app declares these surfaces explicitly by mounting an annotation surface component with a stable id; the annotation layer renders into whatever surfaces are currently mounted rather than detecting them itself.

## Considered Options

Detecting surfaces automatically by watching the DOM for dialogs, top-layer changes and fullscreen transitions was rejected. It needs no host changes, but surface identity would depend on someone else's markup — a popup that renders slightly differently gets a different key and silently loses its annotations. Only the host app knows that a popup is "the media popup for lesson 3", and that identity is what we persist against.

## Consequences

Rendering each surface's layer *inside* the element it annotates means the browser's own stacking handles layering — a popup's annotations sit above the page's because the popup does. No z-index arithmetic, and the fullscreen top-layer case works by construction, since the layer is a descendant of the element that goes fullscreen.

The surface element also defines the coordinate origin and the width used for scaling, so no separate registration of bounds is needed.

**Surfaces may nest, and the inner one wins.** A surface's layer covers its whole box and renders after its own children, so by default an outer surface's layer sits on top of any surface declared inside it and swallows every stroke aimed at the inner one. That was first met in #5 and worked around by keeping annotatable regions as siblings.

That workaround stopped being viable once a page's surface had to span the whole page, since anything else annotatable then falls inside it. The real fix is one rule — `.annotation-surface .annotation-surface { z-index: 1 }` — which lifts an inner surface above its ancestor's layer. The outer surface therefore cannot be annotated across an inner surface's box, which is the correct reading: that region belongs to the inner surface.

Every surface also gets `isolation: isolate`, so that lift stays bounded to its own ancestor. `position: relative` alone does not open a stacking context, so without this a nested surface's z-index:1 has no containing context and rises to the document root — where a page's fullscreen-stage surface, three layers deep, once outranked a dialog on another part of the page that carried no z-index of its own. The dialog was never meant to compete with it; isolation keeps the lift local to the surface it is for.

**A surface's box is what gets annotated**, so the host sizes it. A surface that spans the page is an ordinary block; one used as an overlay is positioned by the host and must also be `pointer-events: none` on the wrapper — only the layer manages pointer events, and a full-viewport wrapper would otherwise swallow every press meant for what is beneath it.
