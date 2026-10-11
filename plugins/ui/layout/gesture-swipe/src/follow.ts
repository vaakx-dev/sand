import type { Swipe } from '@sand/dom'

const idleMs = 80

export interface Drag {
  move(x: number, time: number): void
  end(time: number): void
}

export const follow = (swipe: Swipe, startX: number, startTime: number): Drag => {
  let last = startX
  let lastTime = startTime
  let speed = 0
  return {
    move(x, time) {
      const elapsed = Math.max(time - lastTime, 1)
      speed = 0.8 * speed + (0.2 * (x - last)) / elapsed
      last = x
      lastTime = time
      swipe.move(x - startX)
    },
    end(time) {
      swipe.end(time - lastTime > idleMs ? 0 : speed)
    },
  }
}
