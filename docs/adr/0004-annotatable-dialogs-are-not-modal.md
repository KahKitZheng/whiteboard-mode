# Annotatable dialogs are not modal

A dialog that declares an annotation surface must be non-modal. A modal dialog marks everything outside itself `aria-hidden` and disables pointer interaction there — and the whiteboard toolbar lives outside it, at app level. Made modal, the dialog is annotatable only with whatever tool happened to be selected before it opened, with no way to switch tool, undo, or clear.

This surfaced while implementing #5: with Base UI's default `modal={true}`, `#root` gained `aria-hidden="true"` the moment the dialog opened, taking the toolbar out of the accessibility tree.

## Considered Options

Rendering a second toolbar inside each dialog was rejected: it duplicates state and multiplies with every annotatable popup the host app has.

Portalling the single toolbar into the open dialog would work, but it makes the toolbar's position in the tree depend on which surface is topmost — the kind of coupling ADR 0001 avoids by letting the host declare surfaces.

## Consequences

The host app must render annotatable dialogs with `modal={false}` (or `'trap-focus'`, which keeps focus contained but leaves outside pointer interaction alive). This is a constraint the whiteboard imposes on its host, and it needs saying out loud during integration rather than being discovered as "the toolbar is dead".

A non-modal dialog can be dismissed by pressing outside it, so a stroke drawn on the page behind would close it. Outside-press dismissal is therefore ignored while a dialog declares a surface; it closes by its own control or Escape.
