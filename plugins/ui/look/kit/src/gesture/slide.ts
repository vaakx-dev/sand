import { collectScope, onRaf, sig, type Sig } from '@vaakx-dev/vrui'

const RESPONSE_MS = 300
const FREQUENCY = (2 * Math.PI) / RESPONSE_MS
const STIFFNESS = FREQUENCY * FREQUENCY
const DAMPING = 2 * FREQUENCY
const STEP_MS = 4
const LONGEST_FRAME_MS = 50
const REST = 0.001
const REST_SPEED = REST / 16

const clamp = (value: number) => Math.min(Math.max(value, 0), 1)

const nextFrame = (frame: (time: number) => void) => collectScope(() => onRaf(frame)).value

class Slide {
  readonly #position: Sig<number>
  #target: number
  #velocity = 0
  #held = false
  #lastFrame = 0
  #stop: (() => void) | undefined
  readonly #rested: (at: number) => void

  constructor(at: number, rested: (at: number) => void = () => {}) {
    this.#position = sig(at)
    this.#target = at
    this.#rested = rested
  }

  at() {
    return this.#position.get()
  }

  hold(at: number) {
    this.#held = true
    this.#velocity = 0
    this.#halt()
    this.#position.set(clamp(at))
  }

  release(velocity: number) {
    this.#held = false
    this.#velocity = velocity
    this.#run()
  }

  aim(target: number) {
    this.#target = target
    if (!this.#held) this.#run()
  }

  place(at: number) {
    this.#halt()
    this.#held = false
    this.#velocity = 0
    this.#target = at
    this.#position.set(at)
  }

  #halt() {
    this.#stop?.()
    this.#stop = undefined
  }

  #run() {
    if (this.#stop) return
    if (this.#resting(this.#position.get())) return this.#settle()
    this.#lastFrame = performance.now()
    this.#next()
  }

  #next() {
    this.#stop = nextFrame(time => this.#frame(time))
  }

  #frame(time: number) {
    const elapsed = Math.min(Math.max(time - this.#lastFrame, 0), LONGEST_FRAME_MS)
    this.#lastFrame = time
    const position = this.#advance(this.#position.get(), elapsed)
    if (this.#resting(position)) return this.#settle()
    this.#position.set(position)
    this.#next()
  }

  #advance(start: number, elapsed: number) {
    let position = start
    for (let left = elapsed; left > 0; left -= STEP_MS) {
      const step = Math.min(left, STEP_MS)
      this.#velocity += (STIFFNESS * (this.#target - position) - DAMPING * this.#velocity) * step
      position += this.#velocity * step
      if (position === clamp(position)) continue
      position = clamp(position)
      this.#velocity = 0
    }
    return position
  }

  #resting(position: number) {
    return Math.abs(this.#target - position) < REST && Math.abs(this.#velocity) < REST_SPEED
  }

  #settle() {
    this.#stop = undefined
    this.#velocity = 0
    this.#position.set(this.#target)
    this.#rested(this.#target)
  }
}

export { Slide }
