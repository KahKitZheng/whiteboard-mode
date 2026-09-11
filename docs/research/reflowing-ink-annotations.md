# How others keep ink on reflowing text

Research note, 2026-09-11. Question: when the text under a freehand annotation
rewraps — a word moves to another line, a phrase splits across two — what do
existing systems do, and what did they learn? Read against our ADR 0007.

## The short version

Three families of answer exist, and only one of them actually reflows ink:

1. **Don't let it happen.** Fixed-layout hosts (PDF annotators: Kami, Notability,
   GoodNotes, Acrobat; slide tools; tldraw/Excalidraw canvases) never reflow.
   Word anchors ink to a *paragraph* and admits it breaks for edits inside it.
   OneNote positions drawings absolutely and has a known "drawings don't move
   with the text" problem. Kindle Scribe sidesteps it: ink becomes an inline
   block the book's text flows *around*, plus separate highlight/underline tools
   that are text-range based.
2. **Anchor text, not ink.** Hypothesis, Apache Annotator, browser highlighters:
   the annotation *is* a text range, rendered fresh each time, so wrapping is
   free. No freehand at all.
3. **Reflow the ink per annotation type.** The research line: XLibris (FXPAL,
   1998–2002) and Callisto (Microsoft Research, CHI 2003, later a patent).
   Classify each mark, anchor it to a text range, and transform it by type when
   the range's lines change. This is the only family that addresses our case.

## Family 3 in detail — what to do per type when the words wrap

From Bargeron & Moscovich (CHI 2003) and Microsoft's patent US8250463, which
extends it:

| Type | Anchor | On reflow |
|---|---|---|
| Underline | the range of words beneath it | **Split** the stroke where the line breaks; **join** strokes when two lines become one, low-pass filtered to hide the seam |
| Highlight | same | same as underline |
| Inline circle (one line) | the circled words | Translate with the words; when they split across lines, **copy** the circle and scale a copy to each part. "Reasonable for circled words or short sentences… not for large sloppy circles or circled passages" |
| Region circle (many lines) | the circled block | **Scale** to the new bounding box, never copied |
| Margin comment / symbol | the lines beside it (projected) | Never modified; **translated vertically** to stay beside its anchor, re-centred if the anchor grows |
| Margin bar | same | translated, and **scaled to the anchor's new height** |
| Connector | each **endpoint anchored separately** | translated, rotated and scaled so each end stays on its own anchor |

XLibris used "a stretching and splitting approach" of the same shape.

Callisto also offered a **"cleaned"** rendering: straight underlines,
translucent rectangles for highlights, rounded rectangles for circles, a
Bezier for margin bars. Trivial to reflow, because it is drawn from the anchor.

## What the users said (18 participants, 379 annotations)

- Distribution of marks: underline 31%, highlight 27%, marginalia 24%, circle 12%, margin bar 6%.
- **People want reflow if and only if it looks right.** "Freeze the document instead" correlated strongly and negatively with "appearance acceptable" (r = −0.70). No other resistance.
- **Gross context is what matters.** A condition that randomly *jittered* every annotation was not rated significantly worse than correct reflow. Precise placement mattered less than the authors expected, as long as the mark stayed with its passage.
- **Cleaned-up marks were rated higher** — and raised expectations. Once the system "understood" the mark, people wanted more: "it should have underlined the whole sentence", "my underlines should have become bold".
- **Nearest-text anchoring is too coarse.** The heuristic often picked the whole paragraph when the user meant a few words. Users were surprised by where things landed ("why did it put my underline over this picture?") and wanted to see the anchor *before* reflow happened, unobtrusively, and to be able to fix it.

## Where we stand (ADR 0007) against this

- We anchor to a **text quote** with context — Hypothesis's model — and fall back to the block. Better-grained than Callisto's "nearest text", but our "covers more than half the block → anchor the block" rule is exactly the coarse case the study complains about. The block fallback does meet the *gross context* bar the study says is what counts.
- Every shape is currently transformed the **same way**: translated with its first word, scaled with the font. That is the *margin comment* rule applied to everything. Right for a circled word, a margin scribble, a picture. Wrong for the two commonest marks in the study: an underline or highlight across a phrase that wraps stays one straight stroke at the first word.
- Our **line/arrow endpoints anchor separately** — the connector rule, already right.
- We have **no classification**. The study's authors classified by hand to keep errors out of the results; the patent classifies with dynamic programming over stroke order and geometry, with a user fallback under a confidence threshold. Callisto's authors judged fully automatic classification "may not be feasible".

## What this suggests for the word-wrap case

1. **Classify strokes, coarsely.** Two classes cover 58% of marks and are cheap to tell apart: *linear* (bounding box wide and thin, mostly horizontal, anchored below or over a range of words → underline/highlight) and *enclosure* (closed-ish path around a range). Everything else keeps today's translate-and-scale.
2. **Linear → split per line.** `Range.getClientRects()` gives one box per line of the anchored words. Map the stroke's points along its length onto those boxes in order; a stroke over "the window narrower until" becomes two strokes when the phrase wraps, and one again when it doesn't. The highlighter tool is the obvious first customer.
3. **Enclosure → copy per segment, or scale to the union.** The study says copying works for a word or short phrase, not for sloppy circles round paragraphs; the patent splits the two by whether the anchor was one line or many. Same split works here: circled range on one line → copies; on many → scale to the union box (what we do now).
4. **Show the anchor.** A brief, quiet indication of the words a stroke attached to — the study's one UI recommendation, and the cheapest way to make the coarse-anchor case visible and fixable.
5. **Consider a "cleaned" rendering as an option, not a default.** Rated higher, but it changes what people expect of the system.

Not worth chasing: Hypothesis-style fuzzy matching of edited text (our host does not rewrite its copy under a live annotation), Kindle's flow-around blocks (they answer a different question — where to put a *note*, not how to keep a *mark* on a word).

## Sources

- Bargeron, D. & Moscovich, T. *Reflowing Digital Ink Annotations.* CHI 2003. https://www.dgp.toronto.edu/~tomer/store/papers/reflowchi03.pdf — the framework, the per-type rules, the user study.
- Microsoft, patent US8250463 *Recognizing, anchoring and reflowing digital ink annotations.* https://patents.google.com/patent/US8250463 — six types, anchor data and reflow per type; connectors anchored by endpoint.
- Golovchinsky, G. & Denoue, L. *Moving Markup: Repositioning Freeform Annotations.* UIST 2002. https://doi.org/10.1145/571985.571989 — XLibris; stretch-and-split. (Paywalled; read via the CHI 2003 paper's account of it.)
- Schilit, Golovchinsky, Price. *Beyond Paper.* CHI 1998. https://www.researchgate.net/publication/2369735_Beyond_Paper_Supporting_Active_Reading_with_Free_Form_Digital_Ink_Annotations
- Hypothesis, *Fuzzy Anchoring.* https://web.hypothes.is/blog/fuzzy-anchoring/ — Range, TextPosition and TextQuote selectors tried in order; diff-match-patch for fuzzy fallback.
- Microsoft, *Reflowable Ink: Simple Reflow* (Tablet PC SDK, 2005). https://learn.microsoft.com/en-us/previous-versions/ms812489(v=msdn.10) — reflowing handwriting *as* text; a different problem, included because it turns up in every search.
- Word 2003 documentation, *About using ink in Word.* https://documentation.help/MS-Office-Word-2003/wdAboutUsingInkInWord.htm — "anchored to paragraphs… if you add or remove content in the same paragraph… there can be issues".
- OneNote Gem, *Move Drawing, Handwriting and Ink with Image.* http://www.onenotegem.com/a/documents/gem-for-OneNote/Object_Tab/2019/1124/1107.html — third-party fix for drawings not moving with content.
- Amazon, *Kindle Scribe FAQ.* https://www.aboutamazon.com/news/devices/kindle-scribe — Active Canvas; Engadget hands-on https://www.engadget.com/mobile/tablets/kindle-scribe-hands-on-you-can-scribble-on-your-books-130043335.html
