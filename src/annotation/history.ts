import type { Shape } from './types'

/**
 * Shapes and the two stacks that move them through time. They travel together
 * so undo can never fall out of step with what is on screen.
 *
 * `future` is what undo took away, waiting to be put back. Anything new empties
 * it: once the teacher has carried on from here, the branch they undid is not
 * somewhere they can still get to, and offering a redo that jumps to it would
 * throw away the work done since.
 */
export type Timeline = {
  shapes: Shape[]
  history: Shape[][]
  future: Shape[][]
}

export const EMPTY_FUTURE: Shape[][] = []

/** A change worth taking back. */
export function commit(state: Timeline, update: (shapes: Shape[]) => Shape[]): Timeline {
  return {
    shapes: update(state.shapes),
    history: [...state.history, state.shapes],
    future: EMPTY_FUTURE,
  }
}

/**
 * A change already applied, being recorded after the fact. A drag edits shapes
 * on every pointer move but is one thing to undo, so the state it started from
 * is pushed when it ends.
 */
export function record(state: Timeline, before: Shape[]): Timeline {
  return { shapes: state.shapes, history: [...state.history, before], future: EMPTY_FUTURE }
}

/** An edit that is not worth taking back on its own — mid-gesture redraws. */
export function amend(state: Timeline, update: (shapes: Shape[]) => Shape[]): Timeline {
  return { ...state, shapes: update(state.shapes) }
}

export function undo(state: Timeline): Timeline {
  if (state.history.length === 0) return state

  return {
    shapes: state.history[state.history.length - 1],
    history: state.history.slice(0, -1),
    future: [...state.future, state.shapes],
  }
}

export function redo(state: Timeline): Timeline {
  if (state.future.length === 0) return state

  return {
    shapes: state.future[state.future.length - 1],
    history: [...state.history, state.shapes],
    future: state.future.slice(0, -1),
  }
}
