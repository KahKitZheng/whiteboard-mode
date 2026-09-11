import { describe, expect, it } from 'vitest'
import { describeQuote, elementAt, findQuote, follow, mergeLines, pathTo, unanchored, wordsBetween, type Anchor } from './anchor'
import type { Shape } from './types'

function html(markup: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = markup
  document.body.appendChild(root)
  return root
}

describe('pathTo / elementAt', () => {
  it('names an element by its position under the surface, and finds it again', () => {
    const root = html('<article><p>one</p><p>two <em>deep</em></p></article>')
    const em = root.querySelector('em')!

    const path = pathTo(root, em)
    expect(path).toBe(':scope > article:nth-of-type(1) > p:nth-of-type(2) > em:nth-of-type(1)')
    expect(elementAt(root, path!)).toBe(em)
  })

  it('starts from the nearest id, so the host may move that subtree', () => {
    const root = html('<section><div id="block-7"><p>a</p><p>b</p></div></section>')
    const p = root.querySelectorAll('p')[1]

    const path = pathTo(root, p)!
    expect(path).toBe('#block-7 > p:nth-of-type(2)')

    root.prepend(document.createElement('aside'))
    expect(elementAt(root, path)).toBe(p)
  })

  it('is null for an element outside the surface', () => {
    const root = html('<p>inside</p>')
    expect(pathTo(root, document.body)).toBeNull()
  })
})

describe('describeQuote / findQuote', () => {
  it('round-trips words across element boundaries', () => {
    const root = html('<p>The <em>quick</em> brown fox jumps over the lazy dog.</p>')
    const em = root.querySelector('em')!.firstChild as Text
    const brown = em.parentElement!.nextSibling as Text
    const range = document.createRange()
    range.setStart(em, 0)
    range.setEnd(brown, ' brown'.length)

    const quote = describeQuote(root, range)!
    expect(quote).toEqual({ exact: 'quick brown', prefix: 'The ', suffix: ' fox jumps over the lazy dog.' })

    const found = findQuote(root, quote)!
    expect(found.toString()).toBe('quick brown')
    expect(found.startContainer).toBe(em)
    expect(found.endContainer).toBe(brown)
  })

  it('uses the context to pick the right one of two identical words', () => {
    const root = html('<p>cat one, cat two</p>')
    const quote = { exact: 'cat', prefix: 'cat one, ', suffix: ' two' }

    const found = findQuote(root, quote)!
    expect(found.startOffset).toBe('cat one, '.length)
  })

  it('falls back to the bare words when the context changed', () => {
    const root = html('<p>a cat sat</p>')
    const found = findQuote(root, { exact: 'cat', prefix: 'the ', suffix: ' slept' })!

    expect(found.toString()).toBe('cat')
  })

  it('gives up when the words are gone', () => {
    const root = html('<p>nothing here</p>')
    expect(findQuote(root, { exact: 'cat', prefix: '', suffix: '' })).toBeNull()
  })

  it('ignores text inside the annotation layer', () => {
    const root = html('<p>host</p><svg class="annotation-layer"><text>ink</text></svg>')
    expect(findQuote(root, { exact: 'ink', prefix: '', suffix: '' })).toBeNull()
  })
})

describe('follow', () => {
  const anchor: Anchor = {
    target: { path: ':scope > p:nth-of-type(1)', snippet: '' },
    origin: { x: 100, y: 200 },
    basis: { kind: 'font', value: 18 },
    surfaceWidth: 1280,
  }

  it('moves a point by however far the target moved', () => {
    const move = follow(anchor, { origin: { x: 130, y: 500 }, scale: 1 })
    expect(move({ x: 110, y: 210 })).toEqual({ x: 140, y: 510 })
  })

  it('scales a point about the target when the target grew', () => {
    const move = follow(anchor, { origin: { x: 100, y: 200 }, scale: 2 })
    expect(move({ x: 110, y: 210 })).toEqual({ x: 120, y: 220 })
  })
})

describe('unanchored', () => {
  it('drops both anchors and nothing else', () => {
    const anchor: Anchor = {
      target: { path: 'p', snippet: '' },
      origin: { x: 0, y: 0 },
      basis: { kind: 'font', value: 1 },
      surfaceWidth: 1280,
    }
    const shape: Shape = {
      id: 'a',
      type: 'line',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      color: '#000',
      weight: 4,
      opacity: 1,
      border: 'solid',
      anchor,
      toAnchor: anchor,
    }

    expect(unanchored(shape)).toEqual({
      id: 'a',
      type: 'line',
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
      color: '#000',
      weight: 4,
      opacity: 1,
      border: 'solid',
    })
  })
})

describe('wordsBetween', () => {
  it('spans from the earlier range to the later, whichever way the drag went', () => {
    const root = html('<p>one two three four</p>')
    const node = root.querySelector('p')!.firstChild as Text
    const word = (start: number, end: number) => {
      const range = document.createRange()
      range.setStart(node, start)
      range.setEnd(node, end)
      return range
    }
    const two = word(4, 7)
    const four = word(14, 18)

    expect(wordsBetween(two, four).toString()).toBe('two three four')
    expect(wordsBetween(four, two).toString()).toBe('two three four')
    expect(wordsBetween(two, two).toString()).toBe('two')
  })
})

describe('mergeLines', () => {
  const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom })

  it('joins the pieces of one line and keeps separate lines apart', () => {
    const lines = mergeLines([box(10, 0, 40, 20), box(40, 0, 90, 20), box(0, 26, 60, 46)])

    expect(lines).toEqual([box(10, 0, 90, 20), box(0, 26, 60, 46)])
  })

  it('tolerates pieces that differ a little in height, as an <em> does', () => {
    const lines = mergeLines([box(0, 0, 30, 20), box(30, 2, 60, 21)])

    expect(lines).toHaveLength(1)
  })

  it('drops empty rects and orders by line', () => {
    const lines = mergeLines([box(0, 30, 50, 50), box(5, 5, 5, 25), box(0, 0, 50, 20)])

    expect(lines).toEqual([box(0, 0, 50, 20), box(0, 30, 50, 50)])
  })
})
