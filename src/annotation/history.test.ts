import { describe, expect, it } from 'vitest'
import { amend, commit, record, redo, undo, type Timeline } from './history'
import type { Shape } from './types'

const shape = (id: string): Shape => ({
  id,
  type: 'stroke',
  points: [{ x: 0, y: 0 }],
  color: '#e5484d',
  weight: 9,
  opacity: 1,
})

const empty: Timeline = { shapes: [], history: [], future: [] }

/** Draws three shapes, one commit each. */
function drawn(): Timeline {
  return ['a', 'b', 'c'].reduce(
    (state, id) => commit(state, (shapes) => [...shapes, shape(id)]),
    empty,
  )
}

const ids = (state: Timeline) => state.shapes.map((s) => s.id)

describe('undo and redo', () => {
  it('walks back and forward over the same states', () => {
    const state = drawn()

    expect(ids(state)).toEqual(['a', 'b', 'c'])
    expect(ids(undo(state))).toEqual(['a', 'b'])
    expect(ids(undo(undo(state)))).toEqual(['a'])
    expect(ids(redo(undo(undo(state))))).toEqual(['a', 'b'])
    expect(ids(redo(redo(undo(undo(state)))))).toEqual(['a', 'b', 'c'])
  })

  it('does nothing at either end rather than throwing', () => {
    expect(undo(empty)).toBe(empty)
    expect(redo(empty)).toBe(empty)
    expect(redo(drawn())).toEqual(drawn())
  })

  it('drops the undone branch once something new is drawn', () => {
    const backOne = undo(drawn())
    expect(backOne.future).toHaveLength(1)

    const carriedOn = commit(backOne, (shapes) => [...shapes, shape('d')])

    expect(ids(carriedOn)).toEqual(['a', 'b', 'd'])
    // The branch holding 'c' is gone: redoing to it would throw 'd' away.
    expect(carriedOn.future).toHaveLength(0)
    expect(ids(redo(carriedOn))).toEqual(['a', 'b', 'd'])
  })

  it('drops it for a gesture too, not only for a fresh shape', () => {
    const moved = record(undo(drawn()), [shape('a')])

    expect(moved.future).toHaveLength(0)
  })

  it('takes a whole gesture back in one step', () => {
    const before = drawn().shapes
    const dragging = amend(drawn(), (shapes) => shapes.slice(0, 1))
    // Mid-gesture edits leave no trace of their own to undo.
    expect(dragging.history).toEqual(drawn().history)

    const dropped = record(dragging, before)
    expect(ids(undo(dropped))).toEqual(['a', 'b', 'c'])
  })
})
