import { describe, expect, test } from 'bun:test'
import { firstFrom, kept, stepped } from '../src/web/order'

const blocks = [
  { entry: 'a', block: 0, count: 2 },
  { entry: 'b', block: 1, count: 1 },
  { entry: 'c', block: 0, count: 3 },
]

describe('find order', () => {
  test('a search starts at the first match at or below the top of the view, past earlier ones in the same message, and wraps to the first when none is below', () => {
    expect(firstFrom(blocks, { at: 0, occurrence: 0 })).toEqual({ entry: 'a', block: 0, occurrence: 0 })
    expect(firstFrom(blocks, { at: 2, occurrence: 1 })).toEqual({ entry: 'c', block: 0, occurrence: 1 })
    expect(firstFrom(blocks, { at: 0, occurrence: 2 })).toEqual({ entry: 'b', block: 1, occurrence: 0 })
    expect(firstFrom(blocks, { at: 2, occurrence: 3 })).toEqual({ entry: 'a', block: 0, occurrence: 0 })
    expect(firstFrom(blocks, { at: 3, occurrence: 0 })).toEqual({ entry: 'a', block: 0, occurrence: 0 })
    expect(firstFrom([], { at: 0, occurrence: 0 })).toBeUndefined()
  })

  test('next and previous go through the matches in the order they were said and wrap at both ends', () => {
    expect(stepped(blocks, { entry: 'a', block: 0, occurrence: 1 }, 1)).toEqual({ entry: 'b', block: 1, occurrence: 0 })
    expect(stepped(blocks, { entry: 'c', block: 0, occurrence: 2 }, 1)).toEqual({ entry: 'a', block: 0, occurrence: 0 })
    expect(stepped(blocks, { entry: 'a', block: 0, occurrence: 0 }, -1)).toEqual({ entry: 'c', block: 0, occurrence: 2 })
    expect(stepped(blocks, { entry: 'c', block: 0, occurrence: 0 }, -1)).toEqual({ entry: 'b', block: 1, occurrence: 0 })
    expect(stepped(blocks, undefined, 1)).toEqual({ entry: 'a', block: 0, occurrence: 0 })
    expect(stepped(blocks, undefined, -1)).toEqual({ entry: 'c', block: 0, occurrence: 2 })
  })

  test('the selection stays on its message and occurrence as matches come and go around it', () => {
    const arrived = [{ entry: 'z', block: 0, count: 4 }, ...blocks, { entry: 'd', block: 0, count: 1 }]
    expect(kept(blocks, arrived, { entry: 'b', block: 1, occurrence: 0 })).toEqual({ entry: 'b', block: 1, occurrence: 0 })

    const shrunk = [blocks[0]!, { entry: 'c', block: 0, count: 1 }]
    expect(kept(blocks, shrunk, { entry: 'c', block: 0, occurrence: 2 })).toEqual({ entry: 'c', block: 0, occurrence: 0 })
    expect(kept(blocks, shrunk, { entry: 'b', block: 1, occurrence: 0 })).toEqual({ entry: 'c', block: 0, occurrence: 0 })
    expect(kept(blocks, [blocks[0]!], { entry: 'c', block: 0, occurrence: 1 })).toEqual({ entry: 'a', block: 0, occurrence: 0 })
    expect(kept(blocks, [], { entry: 'a', block: 0, occurrence: 0 })).toBeUndefined()
  })
})
