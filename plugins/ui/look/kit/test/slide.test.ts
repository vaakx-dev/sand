import { afterAll, beforeAll, expect, test } from 'bun:test'
import { Slide } from '../src/gesture/slide'

const FRAME_MS = 16

const frames = new Map<number, FrameRequestCallback>()
let lastId = 0
let clock = 0

const realNow = performance.now

beforeAll(() => {
  performance.now = () => clock
  Object.assign(globalThis, {
    window: {
      requestAnimationFrame: (frame: FrameRequestCallback) => {
        lastId += 1
        frames.set(lastId, frame)
        return lastId
      },
      cancelAnimationFrame: (id: number) => frames.delete(id),
    },
  })
})
afterAll(() => {
  performance.now = realNow
  Reflect.deleteProperty(globalThis, 'window')
})

const tick = () => {
  clock += FRAME_MS
  const due = [...frames.values()]
  frames.clear()
  for (const frame of due) frame(clock)
}

const play = (slide: Slide) => {
  const seen = [slide.at()]
  while (frames.size) {
    tick()
    seen.push(slide.at())
  }
  return seen
}

const largestJump = (seen: number[]) => Math.max(...seen.slice(1).map((at, index) => Math.abs(at - seen[index]!)))

test('a slide caught mid-settle stays under the finger, and a reversed flick lands exactly on the new end without a jump', () => {
  const slide = new Slide(0)
  slide.aim(1)
  for (let frame = 0; frame < 6; frame++) tick()
  const caught = slide.at()
  expect(caught).toBeGreaterThan(0)
  expect(caught).toBeLessThan(1)

  slide.hold(caught)
  expect(slide.at()).toBe(caught)
  expect(frames.size).toBe(0)

  slide.release(-0.004)
  slide.aim(0)
  const seen = play(slide)
  expect(seen.every(at => at >= 0 && at <= 1)).toBe(true)
  expect(largestJump(seen)).toBeLessThan(0.15)
  expect(seen.at(-1)).toBe(0)
})

test('a fast flick settles sooner than a slow release from the same place', () => {
  const settleFrames = (velocity: number) => {
    const slide = new Slide(0)
    slide.hold(0.4)
    slide.aim(1)
    slide.release(velocity)
    return play(slide).length
  }
  expect(settleFrames(0.01)).toBeLessThan(settleFrames(0))
})
