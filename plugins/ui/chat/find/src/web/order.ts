import type { FoundBlock } from '../contract'

export interface Spot {
  entry: string
  block: number
  occurrence: number
}

export interface Start {
  at: number
  occurrence: number
}

export type Direction = 1 | -1

export type Place = Pick<FoundBlock, 'entry' | 'block'>

const sameBlock = (one: Place, other: Place) => one.entry === other.entry && one.block === other.block

const total = (blocks: FoundBlock[]) => blocks.reduce((sum, found) => sum + found.count, 0)

const ordinal = (blocks: FoundBlock[], spot: Spot) => {
  const at = blocks.findIndex(found => sameBlock(found, spot))
  return at < 0 ? undefined : total(blocks.slice(0, at)) + spot.occurrence
}

const spotAt = (blocks: FoundBlock[], index: number): Spot | undefined => {
  let left = index
  for (const { entry, block, count } of blocks) {
    if (left < count) return { entry, block, occurrence: left }
    left -= count
  }
  return undefined
}

const stepped = (blocks: FoundBlock[], spot: Spot | undefined, by: Direction) => {
  const count = total(blocks)
  const from = (spot && ordinal(blocks, spot)) ?? (by === 1 ? -1 : 0)
  return spotAt(blocks, (from + by + count) % count)
}

const firstFrom = (blocks: FoundBlock[], { at, occurrence }: Start) => {
  const index = total(blocks.slice(0, at)) + occurrence
  return spotAt(blocks, index < total(blocks) ? index : 0)
}

const kept = (before: FoundBlock[], after: FoundBlock[], spot: Spot): Spot | undefined => {
  const here = after.find(found => sameBlock(found, spot))
  if (here) return { ...spot, occurrence: Math.min(spot.occurrence, here.count - 1) }
  const following = before.slice(before.findIndex(found => sameBlock(found, spot)) + 1).find(old => after.some(found => sameBlock(found, old)))
  return following ? { entry: following.entry, block: following.block, occurrence: 0 } : spotAt(after, 0)
}

export { firstFrom, kept, ordinal, sameBlock, stepped, total }
