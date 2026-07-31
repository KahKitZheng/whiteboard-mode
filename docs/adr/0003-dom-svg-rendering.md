# One DOM/SVG layer for all shapes

Every shape renders as a React component in the DOM — strokes as SVG paths, widgets as ordinary interactive markup — in a single layer per surface. We are not using a `<canvas>` element.

## Considered Options

Rendering strokes into a canvas 2D context is faster for large numbers of strokes, and is how Excalidraw works. It was rejected because widgets — a timer, a coin flip — are shapes: placed, moved, persisted and restored like any other. A working countdown cannot live inside a canvas without reimplementing text, layout and input.

A split renderer (canvas for ink, DOM above it for widgets) was also rejected: it doubles the coordinate and hit-testing implementations, and makes z-ordering between ink and widgets impossible — widgets would always be above, or always below.

Note that tldraw, the SDK being replaced, is itself DOM-based: shapes are React components positioned by CSS transforms.

## Consequences

A shape and a widget are the same kind of citizen, which is what makes adding a shape type cheap — the extensibility we need for future tools.

The cost is performance with very high shape counts, since each shape is a DOM node. Acceptable for annotation (tens of shapes per surface), not for painting. If ink ever becomes slow, finished strokes can be rasterised to a canvas underlay without changing the data model.
