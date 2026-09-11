import { describe, expect, it } from 'vitest'
import { interactiveAncestor } from './interactive'

function html(markup: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = markup
  return root
}

describe('interactiveAncestor', () => {
  it('finds the control a press landed inside of', () => {
    const root = html('<button><span>Start</span></button>')
    const glyph = root.querySelector('span')!

    expect(interactiveAncestor(glyph)).toBe(root.querySelector('button'))
  })

  it('treats content as content', () => {
    const root = html('<p><em>lesson</em></p>')

    expect(interactiveAncestor(root.querySelector('em')!)).toBeNull()
  })

  it('needs a link to go somewhere', () => {
    const root = html('<a>plain</a><a href="/x">real</a>')
    const [plain, real] = Array.from(root.querySelectorAll('a'))

    expect(interactiveAncestor(plain)).toBeNull()
    expect(interactiveAncestor(real)).toBe(real)
  })

  it('reads roles and editable regions', () => {
    const root = html('<div role="button">x</div><div contenteditable="">y</div><div contenteditable="false">z</div>')
    const [button, editable, frozen] = Array.from(root.children)

    expect(interactiveAncestor(button)).toBe(button)
    expect(interactiveAncestor(editable)).toBe(editable)
    expect(interactiveAncestor(frozen)).toBeNull()
  })
})
