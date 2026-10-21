import type { Swipe } from '@sand/layout/contract'

const idleMs = 80

export interface Drag {
  move(x: number, time: number): void
  end(time: number): void
}

export const follow = (swipe: Swipe, startX: number, startTime: number): Drag => {
  let lastX = startX
  let lastTime = startTime
  let speed = 0
  return {
    move(x, time) {
      const elapsed = Math.max(time - lastTime, 1)
      speed = 0.8 * speed + (0.2 * (x - lastX)) / elapsed
      lastX = x
      lastTime = time
      swipe.move(x - startX)
    },
    end(time) {
      swipe.end(time - lastTime > idleMs ? 0 : speed)
    },
  }
}
