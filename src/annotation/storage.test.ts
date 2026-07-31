import { beforeEach, describe, expect, it } from 'vitest'
import { REFERENCE_WIDTH } from './coords'
import { load, save } from './storage'
import type { Shape } from './types'

/** sessionStorage doesn't exist in Node; this is enough of one. */
function fakeStorage(): Storage {
  const entries = new Map<string, string>()
  return {
    get length() {
      return entries.size
    },
    clear: () => entries.clear(),
    getItem: (name: string) => entries.get(name) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (name: string) => entries.delete(name),
    setItem: (name: string, value: string) => void entries.set(name, value),
  }
}

const SHAPES: Shape[] = [
  { id: 'a', type: 'stroke', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] },
]

beforeEach(() => {
  globalThis.sessionStorage = fakeStorage()
})

describe('storage', () => {
  it('round-trips shapes for a surface', () => {
    save('lesson-one', SHAPES)

    expect(load('lesson-one')).toEqual(SHAPES)
  })

  it('keeps surfaces apart', () => {
    save('lesson-one', SHAPES)

    expect(load('lesson-two')).toBeNull()
  })

  it('returns null for a surface never saved', () => {
    expect(load('nothing-here')).toBeNull()
  })

  it('ignores unreadable data rather than throwing', () => {
    sessionStorage.setItem('wb:broken', '{not json')

    expect(load('broken')).toBeNull()
  })

  it('ignores a payload written by a future version', () => {
    sessionStorage.setItem(
      'wb:future',
      JSON.stringify({ version: 99, refWidth: REFERENCE_WIDTH, shapes: SHAPES }),
    )

    expect(load('future')).toBeNull()
  })

  it('rescales shapes stored against a different reference width', () => {
    sessionStorage.setItem(
      'wb:old',
      JSON.stringify({ version: 1, refWidth: REFERENCE_WIDTH / 2, shapes: SHAPES }),
    )

    const restored = load('old')?.[0]
    if (restored?.type !== 'stroke') throw new Error('expected a stroke')

    expect(restored.points).toEqual([{ x: 20, y: 40 }, { x: 60, y: 80 }])
  })

  it('rescales primitives and text, not just strokes', () => {
    const shapes: Shape[] = [
      { id: 'r', type: 'rect', from: { x: 10, y: 10 }, to: { x: 50, y: 30 } },
      { id: 't', type: 'text', at: { x: 100, y: 200 }, text: 'hello' },
    ]
    sessionStorage.setItem(
      'wb:mixed',
      JSON.stringify({ version: 1, refWidth: REFERENCE_WIDTH / 2, shapes }),
    )

    const [rect, text] = load('mixed') ?? []
    if (rect?.type !== 'rect' || text?.type !== 'text') throw new Error('wrong shapes back')

    expect(rect.from).toEqual({ x: 20, y: 20 })
    expect(rect.to).toEqual({ x: 100, y: 60 })
    expect(text.at).toEqual({ x: 200, y: 400 })
    expect(text.text).toBe('hello')
  })

  it('survives storage being unavailable', () => {
    // @ts-expect-error — deliberately removing it
    delete globalThis.sessionStorage

    expect(() => save('lesson-one', SHAPES)).not.toThrow()
    expect(load('lesson-one')).toBeNull()
  })
})
