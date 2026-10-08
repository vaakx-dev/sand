import { Bus } from '../events/bus'
import { Scope } from '../scope/scope'
import { Layer } from '../services/layer'
import type { ServiceKey } from '../services/types'
import type { Watcher } from '../services/watcher'
import type { Loader } from '../source/loader'

export class App {
  readonly scopes = new Set<Scope>()
  readonly watchers = new Set<Watcher>()
  readonly bus = new Bus()
  readonly root: Scope
  private waiters: (() => void)[] = []
  private hot = new Map<string, Record<string, unknown>>()

  constructor(readonly loader?: Loader) {
    this.root = new Scope(this, undefined, new Layer(this))
  }

  changed(layer: Layer, key: ServiceKey) {
    for (const scope of this.scopes) if (scope.injects(key) && scope.layer.within(layer)) scope.sync()
    for (const watcher of [...this.watchers]) if (this.watchers.has(watcher) && watcher.sees(layer, key)) watcher.fire()
  }

  async settled() {
    while (true) {
      const queues = [...this.scopes].map(scope => scope.settled())
      await Promise.all(queues)
      const after = [...this.scopes].map(scope => scope.settled())
      if (after.length === queues.length && after.every((queue, index) => queue === queues[index])) return
    }
  }

  hotData(address: string) {
    let data = this.hot.get(address)
    if (!data) this.hot.set(address, (data = {}))
    return data
  }

  released() {
    return new Promise<void>(resolve => this.waiters.push(resolve))
  }

  release() {
    const waiters = this.waiters
    this.waiters = []
    for (const resolve of waiters) resolve()
  }

  report(scope: Scope, error: unknown) {
    if (this.bus.has('drydock.error')) this.bus.emit('drydock.error', [scope, error])
    else console.error(`[drydock] ${scope.name}:`, error)
  }
}
