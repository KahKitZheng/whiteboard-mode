# Interactive image in whiteboard-mode — implementation plan

The Claude Design "Interactieve afbeelding" (project 524f26b4, pages
`Interactieve Afbeelding.dc.html` and `InteractieveAfbeeldingElement.dc.html`) as
slide 10: a boardbook with pop-ups, read and edited. The boardbook slide (9) and its
focus areas stay as they are.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | A plain `<img>`, not OpenSeadragon | The design edits on a plain image; nothing here needs zoom. OSD was for scanned spreads |
| 2 | Same data as a boardbook: `AssignmentBoardBookEntity`, `focusAreas: []` | A page saved here loads in app-react's viewer. The design's `{x, y centre, size px}` becomes the entity's `{x, y, width, height}` in percent at the editor's rendered width (`place.ts`) |
| 3 | Editing is square: resize sets width and height alike | The design's resize is one `size`. A text pill grows past its box to fit its label (`markerStyle`) rather than the editor sizing boxes freely |
| 4 | TipTap for the body, writing the viewer's JSON directly | The viewer renders TipTap JSON already; the design's `contenteditable` + `execCommand` would need an HTML→JSON converter on top |
| 5 | In memory; uploads are object URLs | A reload is the fixture again. Persistence is a later question, and files cannot live in `localStorage` anyway |
| 6 | The editor is not a surface, and entering it switches whiteboard mode off | The pop-ups are dragged with the pointer a pen would draw with, and a shape over a draft would outlive it. Read mode is a page surface like a lesson's |
| 7 | The pop-up dialog is the boardbook's `ItemDialog`: non-modal, annotatable | ADR 0004. The design's modal (with `Voorlezen`) is not ported; the hover card beside a marker is |
| 8 | Two saves: the pop-up panel's and the page's | As designed. The panel's save and cancel are per pop-up within the draft (a snapshot of its fields); the page's save makes the draft the page, its cancel drops it |
| 9 | Resize handles are the marker's children, the outline its `::before` | They follow a text pill's real width without measuring. Spans, not buttons: no interactive content inside a button |
| 10 | Not ported: `Verwijder element`, the grip's reordering, `Voorlezen` | The slide is the element; there is no lesson around it to reorder in or remove from |

## Files

```
src/interactive/
  InteractivePage.tsx    the slide: title, Bewerken / Opslaan / Annuleren, read or edit
  InteractiveImage.tsx   read: image, markers, hover card, ItemDialog
  InteractiveEditor.tsx  edit: image or dropzone, draggable markers with handles, add
  PopupPanel.tsx         the selected pop-up's fields, with its own save and cancel
  RichTextEditor.tsx     TipTap with bold, italic, underline
  place.ts               move, resize and centre a box, in percent, within the image
  popup.ts               what the panel's save and cancel cover
  useStage.ts            the image's own size and its width on screen
  fixtures.ts            INTERACTIVE pages
  interactive.scss
src/boardbook/marker.ts  marker placement, split out of BoardBookItem.tsx for the editor
src/boardbook/icons.ts   + ITEM_ICONS, the picker's choices with names
public/interactive/wereld.svg
e2e/interactive.spec.ts
```
