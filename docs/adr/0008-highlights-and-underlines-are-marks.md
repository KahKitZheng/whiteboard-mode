# Highlights and underlines are marks on words, not ink

The highlighter with *Snap to words* on, and the pen with *Underline* or *Strikethrough* on, do not store the stroke when dragged over text. They store the words the drag passed over — as a text quote, the same anchor ADR 0007 gives a stroke — and are drawn afresh from those words' line boxes on every layout. When the words wrap onto another line the mark wraps with them; when two lines become one, so does the mark. Over anything that is not text, or with the option off, both tools are ink as usual.

The options are opt-in and off by default: a teacher who wants ink gets ink, and nothing changes under their hand without their saying so.

This is how a rich-text editor's marks work: a range and a type, rendered on demand.

## Considered Options

**Reflow the ink.** The research (see `docs/research/reflowing-ink-annotations.md`) does this: classify each stroke, then split underlines at line breaks, copy circles per line, and so on. Its hard part is the classification — guessing what a stroke *is* — which its authors doubted could be made fully automatic. Here the teacher picks the tool, so there is nothing to guess.

**Keep the ink and accept the drift.** The two commonest marks people make are underlines and highlights (31% and 27% in the study), and a straight stroke across a phrase is exactly the mark that breaks when the phrase wraps. Not acceptable for the two marks that matter most.

**Snap to sentences or paragraphs** rather than words was rejected. The study found that "cleaned up" marks raise expectations — people then wanted the system to have taken the whole sentence for them — but a mark that takes more than the pen touched is a mark the teacher did not make. Words are the unit; whole sentences are a drag away.

## How it works

On press over words (`wordAt`: the host element under the pointer, its block, the word the pointer touches), the tool starts a *marking* drag instead of a stroke. Each move extends the range from the first word to the word under the pointer, in either direction (`wordsBetween`), within the block it started in — a mark belongs to one block. The draft is drawn live. On release it is committed as a `Mark`: kind, anchor (path, snippet, quote), the line boxes it was last seen at, and colour, weight and opacity.

Placement re-finds the quote in its block and takes `Range.getClientRects()`, merged into one box per line (`mergeLines`). The renderer draws each box as ink — a chisel stroke through the middle of a highlight's box, a pen line under an underline's, with a small deterministic waver so it reads as drawn — using the same `strokePath` as freehand ink.

A mark can be selected, restyled and deleted. It cannot be moved or resized: its words decide where it is.

## Consequences

Word wrap costs nothing, and neither does the column changing width or the font changing size — the boxes come from the words.

A mark that crosses two blocks is not possible; the drag stops extending at the block's edge. Acceptable for a highlighter; revisit if teachers reach for it.

When the words are gone (the host rewrote the text) the mark draws where it last was, from its stored boxes — the same fallback as an anchored stroke.

A host may declare the block. The boardbook's text layer (`TextLayer.tsx`) lays the page's words invisibly over the picture, one absolutely positioned span per line, so the picture stays what you see and the words are what the highlighter snaps to. Each positioned span computes as a block, which would end a mark at the line; `data-block` on the layer names it as the one block instead. The picture's text arrives as data — read off the fixture SVG for now, from pdf.js's `getTextContent` once pages are uploaded as PDFs — never rendered from it.

*Amended:* the first version switched the highlighter to marking whenever there were words under it, and had a separate underline tool. Both went: marking is a setting on the tool that makes it, so the default experience is the one teachers already know, and underline and strikethrough are what a *pen* does to words rather than tools of their own.
