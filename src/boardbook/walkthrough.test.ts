import { describe, expect, it } from 'vitest'
import { areaLabel, byOrder, neighbour } from './walkthrough'

const AREAS = [
  { id: 'c', x: 0, y: 0, width: 10, height: 10, order: 3 },
  { id: 'a', x: 0, y: 0, width: 10, height: 10, order: 1 },
  { id: 'b', x: 0, y: 0, width: 10, height: 10, order: 2 },
]

describe('walkthrough', () => {
  it('walks in the authored order, not the stored one', () => {
    expect(byOrder(AREAS).map((area) => area.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not reorder the input', () => {
    byOrder(AREAS)
    expect(AREAS[0].id).toBe('c')
  })

  it('starts the walkthrough at the first area', () => {
    expect(neighbour(byOrder(AREAS), null, 'next')?.id).toBe('a')
    expect(neighbour(byOrder(AREAS), null, 'previous')).toBeNull()
  })

  it('steps both ways and stops at the ends', () => {
    const ordered = byOrder(AREAS)

    expect(neighbour(ordered, 'a', 'next')?.id).toBe('b')
    expect(neighbour(ordered, 'b', 'previous')?.id).toBe('a')
    expect(neighbour(ordered, 'c', 'next')).toBeNull()
    expect(neighbour(ordered, 'a', 'previous')).toBeNull()
  })

  it('has nowhere to go without areas', () => {
    expect(neighbour([], null, 'next')).toBeNull()
  })

  it('labels an area by name, unless the name is just its number again', () => {
    const area = AREAS[1]

    expect(areaLabel({ ...area, name: 'De kringloop' })).toBe('De kringloop')
    expect(areaLabel({ ...area, name: '1' })).toBe('Focus area 1')
    expect(areaLabel({ ...area, name: '' })).toBe('Focus area 1')
    expect(areaLabel(area)).toBe('Focus area 1')
  })
})
