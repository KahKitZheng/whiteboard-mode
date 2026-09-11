/**
 * What the host means to be pressed, by platform semantics rather than a list
 * the host maintains: a third-party component's button is a <button>, and an
 * attribute someone forgets to add fails silently. `closest()` walks up, so a
 * glyph inside a button counts as the button.
 *
 * Only consulted for the tools whose tap means something of its own (select,
 * eraser, text); a drawing tool leaves every tap to the host. If this ever
 * matches wrong, the fix is an opt-out attribute, not a longer list — ADR 0006.
 */
const INTERACTIVE = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="slider"]',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ')

/** The control a press landed on, or null when it landed on content. */
export function interactiveAncestor(target: Element): Element | null {
  return target.closest(INTERACTIVE)
}
