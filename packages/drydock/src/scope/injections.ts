import type { Layer } from '../services/layer'
import type { ServiceKey } from '../services/types'

export class Injections {
  private resolved = new Map<ServiceKey, unknown>()

  constructor(
    private layer: Layer,
    private keys: () => readonly ServiceKey[],
  ) {}

  missing() {
    return this.keys().filter(key => this.layer.resolve(key) === undefined)
  }

  includes(key: ServiceKey) {
    return this.keys().includes(key)
  }

  current() {
    return this.keys().every(key => {
      const impl = this.layer.resolve(key)
      return impl !== undefined && impl === this.resolved.get(key)
    })
  }

  capture() {
    this.resolved = new Map(this.keys().map(key => [key, this.layer.resolve(key)]))
  }

  clear() {
    this.resolved.clear()
  }
}
