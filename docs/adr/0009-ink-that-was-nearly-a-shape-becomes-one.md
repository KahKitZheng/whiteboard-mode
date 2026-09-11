# Ink that was nearly a shape becomes one

A pen stroke that was nearly a circle, a box, a line, a curve or an arrow can become exactly that, drawn in the pen's ink. Two things trigger it: the pen's *Shapes: Tidy* setting, which recognises every stroke on release; and holding the pen still for a moment before lifting, which recognises that stroke whatever the setting — previewing the shape while the pen is held, and giving the ink back if the pen moves on. Neither is on by default; a stroke that is nearly nothing stays ink under both.

## Considered Options

**A tray of shape tools** is what exists, and stays for the prototype. Most teachers use the pen and the highlighter; placing a rectangle is a nice-to-have that a whole tool is a lot to pay for, and picking a tool, drawing, and picking the pen again is three steps for one box.

**A library** (`$1` and its family, or a model) was rejected. There are four shapes and they differ in ways a handful of measurements catches: is the stroke closed; how much of its own box does it fill (a circle ~0.79, a box ~1); how many sharp turns does it make (a box four, a circle none); how far does it stray from the line between its ends. Roughly a hundred lines, no dependency, and every threshold is a named number a teacher's complaint can be traced to.

**Always on** was rejected for the same reason as always-on word snapping (ADR 0008): a sketch that is meant to be loose should not tidy itself.

## How it works

`recognise(points)` resamples the stroke to 64 evenly spaced points and measures it. Closed (ends within ~a fifth of the diagonal, and long enough not to be a dot): four or more corners with a fill over 0.78 is a rectangle; one corner or none with a fill between 0.55 and 0.92 is an ellipse; anything else is nothing. Open: the tip is the *first* point as far from the start as the stroke ever gets — first, because an arrowhead passes back through it. The shaft has to be straight, or one clean bend: a quadratic curve fitted through the stroke's middle that the whole stroke stays within 6% of the chord of. An S stays ink. What follows the tip, if it stays near it, is the head: none makes a plain line, a head of 8–60% of the shaft's length puts an arrowhead on the end.

*Line and arrow are one shape.* A line has `heads` (none, end, both) and an optional `bend` — the control point of its curve. The arrow tool went; arrowheads are a setting of the line tool, and the recogniser sets them. Selected, a line shows a round handle at its middle: drag it to bend the line, or to straighten one that is bent. Stored arrows from before load as lines with a head. Sides within 12% of each other become equal, so a near-circle is a circle and a near-square a square, centred where they were. A line within 6° of level or upright becomes exactly so.

*Tidy* and the pen's *Words* option (ADR 0008) exclude each other: turning one on turns the other off. A stroke cannot both become a rectangle and underline the words it crossed, and a teacher should not have to remember which of two switches wins.

The recognised shape takes the stroke's colour, weight and opacity, and the tray's current border and fill — so the result is what the shape tool would have drawn. It is anchored like any other shape (ADR 0007).

For hold-to-snap, every pen move outside a 3px jitter restarts a 600ms clock and takes back any preview; the clock running out recognises what has been drawn so far and previews it as the draft. Release with a preview showing commits the preview; release without one goes through the *Tidy* setting, then falls back to ink.

## Consequences

The shape tray can go in the final version without the data changing: a recognised circle is an `ellipse` like one from the tray, and everything downstream — anchoring, selection, restyling, storage — already handles it.

The thresholds are guesses tuned on synthetic strokes and one hand. They will need a pass with real teachers on a real board, where a "circle" is much rougher than a mouse's. Arrows are the weakest: the head must be drawn as part of the same stroke.

The hold gesture competes with nothing today. If the pen ever gains a press-and-hold meaning — a context menu, a lasso — this is the decision to revisit.
