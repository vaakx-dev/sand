import type { Fix } from '../contract'

type Answer = (pc: string, id: string, fix: Fix) => void

interface LocatorOptions {
  geolocation: Geolocation
  sharing: () => boolean
  answer: Answer
}

const GIVE_UP_MS = 15_000

const PRECISE: PositionOptions = { enableHighAccuracy: true, timeout: GIVE_UP_MS }

const fixOf = ({ coords }: GeolocationPosition): Fix => ({ latitude: coords.latitude, longitude: coords.longitude, accuracyMeters: coords.accuracy })

class Locator {
  readonly #geolocation: Geolocation
  readonly #sharing: () => boolean
  readonly #answer: Answer
  readonly #watches = new Map<string, number>()

  constructor({ geolocation, sharing, answer }: LocatorOptions) {
    this.#geolocation = geolocation
    this.#sharing = sharing
    this.#answer = answer
  }

  ask(id: string, pc: string) {
    if (!this.#sharing()) return
    if (this.#watches.has(id)) return
    const found = (position: GeolocationPosition) => {
      this.settle(id)
      this.#answer(pc, id, fixOf(position))
    }
    this.#watches.set(id, this.#geolocation.watchPosition(found, () => this.settle(id), PRECISE))
  }

  settle(id: string) {
    const watch = this.#watches.get(id)
    if (watch === undefined) return
    this.#geolocation.clearWatch(watch)
    this.#watches.delete(id)
  }

  stop() {
    for (const id of this.#watches.keys()) this.settle(id)
  }
}

export { Locator }
