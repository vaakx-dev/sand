import type { App } from '../app/app'
import type { Scope } from '../scope/scope'
import type { ServiceKey, Services } from './types'

export interface Provision {
  key: ServiceKey
  impl: unknown
  scope: Scope
}

let ids = 0

export class Layer {
  readonly id = ++ids
  private provisions = new Map<ServiceKey, Provision[]>()

  constructor(
    private app: App,
    readonly parent?: Layer,
  ) {}

  resolve<K extends ServiceKey>(key: K): Services[K] | undefined {
    for (let layer: Layer | undefined = this; layer; layer = layer.parent) {
      const top = layer.provisions.get(key)?.at(-1)
      if (top) return top.impl as Services[K]
    }
  }

  provide(key: ServiceKey, impl: unknown, scope: Scope) {
    const provision = { key, impl, scope }
    this.provisions.set(key, [...(this.provisions.get(key) ?? []), provision])
    this.app.changed(this, key)
    return () => {
      const rest = (this.provisions.get(key) ?? []).filter(entry => entry !== provision)
      if (rest.length) this.provisions.set(key, rest)
      else this.provisions.delete(key)
      this.app.changed(this, key)
    }
  }

  within(layer: Layer) {
    for (let current: Layer | undefined = this; current; current = current.parent) if (current === layer) return true
    return false
  }

  list() {
    return [...this.provisions.values()].flatMap(stack =>
      stack.map((provision, index) => ({ ...provision, active: index === stack.length - 1 })),
    )
  }
}
