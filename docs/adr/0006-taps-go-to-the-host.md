# Armed, a tap goes to the host; a drag draws

With whiteboard mode on, a press is not decided at press time. If the pointer lifts without moving it was a tap, and the browser delivers the click to whatever was pressed as it normally would — a button, a marker, a backdrop, a plain `div` with a handler; no synthesised event, real focus, real `:active`. If it moves first, it was a stroke, started from where the press landed, and the click the browser still fires afterwards is dropped.

With a drawing tool this holds for *every* press: a tap draws nothing with a pen anyway, so leaving it to the host costs no ink and means nobody has to remember which parts of the app still work while armed — they all do. The three tools whose tap has a meaning of its own (select, eraser, text) take a tap on content immediately and wait only over a control, where a control is decided by platform semantics (`interactive.ts`).

*Amended:* the first version waited only over controls, for every tool. A tap on a dialog's backdrop then drew nothing and dismissed nothing, which is exactly the "what works while armed?" question this decision exists to remove.

## Considered Options

**Every press draws** was the first version, and app-react's: markers and controls go `pointer-events: none` while armed. It was replaced because a teacher armed with a pen still wants to press a marker, start a timer, or step to the next focus area without disarming first. A tap draws nothing anyway — a one-point stroke fails `worthKeeping` — so making it the host's costs no ink.

**Deciding at press time** is not possible: a tap and the start of a drag are the same event.

**Synthesising a click on release** — capturing every press, then dispatching a click at the control if the pointer never moved — was rejected: it forwards `click` and nothing else, so hover, focus, `:active` and anything listening to pointer events would be missing.

**Which controls count** (for the three tap tools) is decided by platform semantics — `button`, `a[href]`, form fields, editable regions, ARIA widget roles — and not by an attribute the host adds. A third-party component's button is a `<button>`, and its internals are out of the host's reach; an attribute the host forgets fails silently. If the selector ever over-matches (a whole card that is an `<a>`), the fix is an opt-out attribute on that element, not a longer list.

## Consequences

**The layer is never hit-tested.** The pointer handlers moved from the `<svg>` to the surface's own element, and the svg is `pointer-events: none` armed or not, so `event.target` is the host's element under the pointer. That is the whole mechanism: `closest()` on the target says whether the press landed on a control.

**The surface opts itself in while armed.** A host wrapper may be `pointer-events: none` (ADR 0001, the popup surface); `.annotation-surface[data-active]` turns it back on. It also carries the cursor, `touch-action` and `user-select` the svg used to.

**Nested surfaces stop propagation.** With handlers on the container, a press inside an inner surface would bubble to the outer one and both would draw. Each handler stops propagation; the inner one wins, as ADR 0001 wants.

**Widgets are live while armed.** `widget.scss` no longer switches them off; a tap on the timer's buttons is the timer's, a drag over it draws.

**The boardbook's markers and areas are children of its surface**, positioned by percentage of the image box, rather than OSD overlays of their own — the surface has to see them as targets. Their screen behaviour is unchanged (ADR 0005). While off, OSD's tracker captures the press and would keep the click; the boardbook clicks the control itself when OSD reports a quick release (ADR 0005). While armed the tracker is off and the press is the surface's, listening at React's root.

**A tap is allowed to drift.** A real press moves between down and up — a few pixels with a mouse, a dozen with a finger on a board — and a tap read as a stroke draws a dot on the very button it meant to press. The slop is per pointer type (`TAP_SLOP`), sized from that rather than from what a test harness does.

**This is a quality-of-life layer, not a replacement for the whiteboard toggle.** Tap-through settles what a *tap* means; the toggle still settles what a *drag* means — pan or stroke on the boardbook, scroll or stroke on touch, text selection or stroke, a host drag handle or stroke. Nothing here forces those through the pen, and removing the toggle because "everything works while armed now" would break every one of them. Whether the toggle stays a button or becomes implicit in tool selection is open.

**Known cost:** a stroke can no longer start with a *dot* on a control, and `select` cannot pick a shape that lies over a control by tapping it. Both were judged acceptable for now; see whether they bite.
