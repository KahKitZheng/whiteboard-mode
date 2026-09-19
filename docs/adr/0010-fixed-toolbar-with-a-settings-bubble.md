# The toolbar is one fixed pill; a tool's settings are a bubble above it

The whiteboard toolbar is a single pill fixed along the bottom of the screen, centred: the switch, the tools, undo, redo and clear. It does not move and it does not change size with what is going on. Whatever only matters for the tool in hand — its colour and weight, the pen's Words and Tidy options, a line's heads, and what can be done to a selected shape — is a bubble that opens above that tool's button. Picking a tool opens its bubble; pressing the tool again toggles it; a press anywhere else, the lesson most of all, puts it away; Escape too. While a shape is selected the bubble stays up, since it is the only way to restyle or delete the shape from the toolbar.

## Considered Options

**Two draggable bars** — a tool pill that stood up near a screen edge, and a settings column in a corner — was the first build. It was replaced: the settings sat far from the tool they belonged to, a bar that changed shape as it was dragged moved every control on it, and the grip, the clamping and the orientation logic were more code than the tools themselves. A teacher's hand learns where the pen is when the pen does not move.

**Settings always visible** was rejected: the bubble covers the lesson while it is up, and most of a lesson is drawing, not choosing. It closes on the first press elsewhere.

**Settings on a second press only** was rejected for the demo: picking a tool and being shown what it can do is the moment a new user learns the tool has options.

**A tray of shape tools** went with the bars (ADR 0009, amended). A box or a circle is drawn with the pen and tidied; a line has its own tool because it is reached for as often as the pen.

## Consequences

`DraggableBar`, `ContextualBar`, `ToolGroup` and the window clamping are gone, and `@dnd-kit` with them. `ToolSettings` renders unchanged inside the bubble, wrapped in its own Base UI `Toolbar.Root`.

The bubble is a Base UI `Popover` anchored to the active tool's button, without a trigger of its own: the pill decides when it is open. Its dismissal on an outside press is done by hand in the capture phase, because the annotation surface stops its presses from bubbling and the popover's own listener would never see them.

Fill and border can no longer be chosen before drawing; a recognised shape takes the defaults and offers both once selected.
