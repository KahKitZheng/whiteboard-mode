# Whiteboard Mode

An annotation layer for a host application: teachers draw over lesson content on a school digital board, and the drawings belong to the thing they were drawn on.

## Language

### The layer

**Whiteboard Mode**:
The state in which the annotation layer captures pointer input and the toolbar is visible. When it is off, annotations remain on screen but are inert.
_Avoid_: Draw mode, edit mode, annotation mode

**Surface**:
An annotatable region declared by the host app, owning its own annotations. A page, a popup, and a fullscreen view are each separate surfaces.
_Avoid_: Canvas, board, page, layer

**Reference Width**:
The width a surface's coordinates are stored against. Rendering scales stored coordinates by the surface's actual width divided by this.
_Avoid_: Base width, design width

### Things on a surface

**Shape**:
A persisted object belonging to a surface — its type, position, size and properties. A pen stroke and a timer are both shapes.
_Avoid_: Object, element, item, annotation (as a countable noun)

**Stroke**:
A shape produced by freehand drawing, stored as the captured input points.
_Avoid_: Line, path, scribble, ink

**Primitive**:
A shape with a fixed geometric form the user places rather than draws freely — rectangle, ellipse, arrow, line, text.
_Avoid_: Basic shape, standard shape

**Widget**:
A shape whose rendering is interactive rather than static — a timer, a coin flip. A widget is a shape in every other respect: placed, moved, persisted, restored.
_Avoid_: Plugin, tool (a widget is not a tool), gadget

**Annotation**:
Collective, uncountable — what a surface holds. Use *shape* when counting or referring to one.

### Acting on a surface

**Tool**:
The input state machine active while drawing — what pointer down, move and up do. The pen is a tool; the stroke it produces is a shape.
_Avoid_: Mode, instrument

**Host App**:
The application the annotation layer sits over. It declares surfaces; it does not know how they are drawn on.
_Avoid_: Parent app, consumer, client

### Boardbook

**Boardbook**:
An assignment whose content is one page image — usually a scanned textbook spread — with markers and focus areas authored over it in percentages of the image. Data shape is app-react's `AssignmentBoardBookEntity`.
_Avoid_: Bordboek, slide, page (as the entity)

**Marker**:
A point on the boardbook image that opens an item's content in a dialog. Keeps its screen size while the image zooms.
_Avoid_: Item (the marker is what you see; the item is the data behind it), hotspot, pin

**Focus Area**:
An authored rectangle on the boardbook image that the view frames when pressed. Carries no content, owns no annotations — it moves the camera.
_Avoid_: Zoom area, region

**Walkthrough**:
Stepping through a boardbook's focus areas in their authored `order`, from the chrome, with the view framing each in turn.
_Avoid_: Slideshow, tour

**Home Zoom**:
The zoom at which the whole boardbook image fits its container — where it opens, and what a marker's authored size and a stroke's stored weight are relative to.
_Avoid_: Default zoom, fit zoom, base zoom
