# Shapes anchor to the host content under them

A shape remembers what was under it when it was made — the words it was drawn over, or the picture or block it sits on — and where that was. Rendering finds the thing again and moves the shape by however far it went, scaling it by how much the thing grew. A shape over nothing, or whose target is gone, stays at its coordinates, which is the behaviour ADR 0002 describes.

This supersedes the consequence ADR 0002 accepted: that scaling places a shape at the same *relative* position rather than over the same *content*. The assignments this layer is for are responsive — two columns on a wide screen, one on a narrow one — so content moves out from under its annotations as a matter of course, not only when a developer resizes a window.

## Considered Options

**Lay the host out at a fixed width and scale the whole stage** makes reference-width scaling exact, and is what app-react's tldraw mode effectively does. Rejected: the host is responsive, and making it a scaled stage would be a product decision the annotation layer has no business forcing.

**Anchor to the nearest block only** handles content moving — columns stacking, blocks appearing above — but not a word wrapping to another line inside its own paragraph when the column changes width. It is the fallback here, not the answer.

**Anchor to the words** is Hypothesis' model: a text quote with a little context on each side, re-found in the block when it is time to draw. `@apache-annotator/dom` implements it; its matcher is asynchronous, and placement here runs synchronously during render, so the ~40 lines it would replace are written here instead (`anchor.ts`).

## How it works

At creation the shape's screen box is probed with `elementFromPoint` — centre first, then the middle of each edge — for a host element inside this surface and outside any layer or nested surface. From that hit, walk up to the nearest block or replaced element. Then:

- A **picture** (`img`, `svg`, `video`, …): anchor to the element, origin its top-left, basis its width. The shape scales with the picture.
- **Words** under the box (reaching a little out, since an underline sits below its word): anchor to the element and a quote of those words, origin the first word's rect, basis the block's font size. A shape covering more than half the block's text is about the block, not its words.
- Anything else: anchor to the block, basis its font size — text does not grow when its column does.

A line anchors each end separately, so one drawn from a word to a picture keeps pointing at both; its bend, if it has one, goes halfway with each.

The element is named by a `>` path of `tag:nth-of-type` steps from the surface, or from the nearest ancestor with an `id`, which survives the host reordering things. A snippet of its text rejects a different element that took its place. **Hosts should give annotatable blocks stable ids** — app-react's assignment blocks already have them.

Placement happens whenever shapes, the surface's width, or the host's layout change. A `MutationObserver` on the surface (ignoring the layer, which mutates on every stroke), image `load` events and `document.fonts.ready` cover the layout changes that leave the width alone.

`elementFromPoint` cannot answer for a point outside the viewport, or one something else is painted over (the toolbar); then the deepest host element whose box contains the point is taken instead.

## Consequences

**Shapes from before anchoring are adopted.** Seeds, and surfaces saved by an earlier build, carry no anchor. On a surface's first layout every anchorless shape is anchored to whatever is under it right then — not as a history entry, since the teacher did nothing. Where the layout has already shifted since they were drawn they latch onto the wrong spot, which is exactly where they would have sat anyway; from then on they stop drifting.


Editing works on the *placed* shape: a move or resize starts from where the shape is drawn, and the result is anchored afresh — it is over something else now. Undo restores the anchored original.

Anchoring is off for a surface with a `viewBox` (ADR 0005): there the image *is* the content and scales as one, so reference coordinates are already exact. Words are still looked up on such a surface, so a mark (ADR 0008) can be made over a text layer laid on the image; its line boxes are reference units and scale with the image like a stroke's points, so it is stored once and never re-placed.

Anchors are stored with the shape. The stored format is unchanged in kind — an optional field — so existing surfaces load as before and their shapes simply stay put.

Known gaps: a shape spanning two blocks anchors to whichever is under its centre; a quote that occurs twice in a block without distinguishing context lands on the first; a host that rewrites its text loses the anchor and the shape stays where it was.
