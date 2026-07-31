# Annotatable dialogs are not modal

A dialog that declares an annotation surface must be non-modal. A modal dialog marks everything outside itself `aria-hidden` and disables pointer interaction there — and the whiteboard toolbar lives outside it, at app level. Made modal, the dialog is annotatable only with whatever tool happened to be selected before it opened, with no way to switch tool, undo, or clear.

This surfaced while implementing #5: with Base UI's default `modal={true}`, `#root` gained `aria-hidden="true"` the moment the dialog opened, taking the toolbar out of the accessibility tree.

## Considered Options

Rendering a second toolbar inside each dialog was rejected: it duplicates state and multiplies with every annotatable popup the host app has.

Portalling the single toolbar into the open dialog would work, but it makes the toolbar's position in the tree depend on which surface is topmost — the kind of coupling ADR 0001 avoids by letting the host declare surfaces.

## Consequences

The host app must render annotatable dialogs with `modal={false}` (or `'trap-focus'`, which keeps focus contained but leaves outside pointer interaction alive). This is a constraint the whiteboard imposes on its host, and it needs saying out loud during integration rather than being discovered as "the toolbar is dead".

A non-modal dialog closes when focus leaves it, and reaching for the whiteboard toolbar looks exactly like that. Focus-out dismissal is therefore ignored while a dialog declares a surface. Pressing the backdrop, its own control, or Escape all still close it.

A dialog's surface spans the whole viewport rather than the dialog's own box, so with whiteboard mode armed the teacher can annotate anywhere on screen and the marks belong to the dialog. That surface is also what decides what a press outside the dialog means, without any code asking:

- **Armed** — the layer is live and takes the press, so it draws. The dialog stays open.
- **Off** — the layer is inert, so the press falls through to the backdrop beneath and dismisses.

Which is the behaviour you want either way: while drawing, an errant press should not throw away the thing you are annotating; while not drawing, pressing outside means "done".
