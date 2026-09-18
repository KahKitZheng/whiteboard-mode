/**
 * How far a press may drift and still be a tap, per pointer type: a few pixels
 * with a mouse, a dozen with a finger on a board. A real press moves a little
 * between down and up, and a tap read as a stroke draws a dot on the very
 * button it meant to press.
 */
const TAP_SLOP: Record<string, number> = { mouse: 6, pen: 8, touch: 12 }
const DEFAULT_TAP_SLOP = 8

export function tapSlop(pointerType: string): number {
  return TAP_SLOP[pointerType] ?? DEFAULT_TAP_SLOP
}

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
