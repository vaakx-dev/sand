import { expect, test } from 'bun:test'
import type { Fix } from '../src/contract'
import { Locator } from '../src/web/locator'

interface Watch {
  found: PositionCallback
  failed?: PositionErrorCallback | null
}

const DENIED = { code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as const

class FakeGeolocation implements Geolocation {
  readonly watches = new Map<number, Watch>()
  #next = 0

  watchPosition(found: PositionCallback, failed?: PositionErrorCallback | null) {
    this.#next += 1
    this.watches.set(this.#next, { found, failed })
    return this.#next
  }

  clearWatch(watch: number) {
    this.watches.delete(watch)
  }

  getCurrentPosition() {}

  move(latitude: number, longitude: number, accuracy: number) {
    const coords = { latitude, longitude, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON: () => ({}) }
    const position = { coords, timestamp: Date.now(), toJSON: () => ({}) }
    for (const { found } of [...this.watches.values()]) found(position)
  }

  deny() {
    for (const { failed } of [...this.watches.values()]) failed?.(DENIED)
  }
}

const located = () => {
  const geolocation = new FakeGeolocation()
  const answers: { pc: string; id: string; fix: Fix }[] = []
  const device = { sharing: true }
  const locator = new Locator({ geolocation, sharing: () => device.sharing, answer: (pc, id, fix) => answers.push({ pc, id, fix }) })
  return { geolocation, answers, device, locator }
}

test('each ask is answered once, to the PC that asked, and the position watch stops after the first fix', () => {
  const { geolocation, answers, locator } = located()
  locator.ask('ask-1', 'pc-home')
  locator.ask('ask-2', 'pc-work')

  geolocation.move(-33.8567844, 151.213108, 3.2)
  geolocation.move(-33.86, 151.2, 50)

  expect(answers).toEqual([
    { pc: 'pc-home', id: 'ask-1', fix: { latitude: -33.8567844, longitude: 151.213108, accuracyMeters: 3.2 } },
    { pc: 'pc-work', id: 'ask-2', fix: { latitude: -33.8567844, longitude: 151.213108, accuracyMeters: 3.2 } },
  ])
  expect(geolocation.watches.size).toBe(0)
})

test('with sharing off the device never reads its position for an ask, and answers again once sharing is back on', () => {
  const { geolocation, answers, device, locator } = located()
  device.sharing = false
  locator.ask('while-off', 'pc-home')
  expect(geolocation.watches.size).toBe(0)

  device.sharing = true
  locator.ask('back-on', 'pc-home')
  geolocation.move(-33.8567844, 151.213108, 3.2)

  expect(answers).toEqual([{ pc: 'pc-home', id: 'back-on', fix: { latitude: -33.8567844, longitude: 151.213108, accuracyMeters: 3.2 } }])
})

test('an ask settled elsewhere, or one the system refuses, stops watching and is never answered', () => {
  const { geolocation, answers, locator } = located()
  locator.ask('settled', 'pc-home')
  locator.settle('settled')
  locator.ask('refused', 'pc-home')
  geolocation.deny()

  geolocation.move(-33.8567844, 151.213108, 3.2)

  expect(answers).toEqual([])
  expect(geolocation.watches.size).toBe(0)
})
