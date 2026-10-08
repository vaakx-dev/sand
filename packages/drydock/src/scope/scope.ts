import type { App } from '../app/app'
import { createContext } from '../context/create'
import type { Context, Dispose } from '../context/types'
import type { AnyPlugin } from '../plugin/types'
import { Layer } from '../services/layer'
import type { ServiceKey } from '../services/types'
import type { Source } from '../source/loader'
import { Disposers } from './disposers'
import { Holds } from './holds'
import { Injections } from './injections'
import { Lifecycle } from './lifecycle'
import type { Mount } from './mount'
import { TaskQueue } from './queue'
import type { Kind, ScopeView, Status } from './view'

export type { Mount } from './mount'

let ids = 0

const basename = (path: string) => path.split(/[\\/]/).filter(Boolean).at(-1) ?? path

export class Scope implements ScopeView {
  readonly id = ++ids
  readonly ctx: Context
  readonly children = new Set<Scope>()
  status: Status
  error?: unknown
  plugin?: AnyPlugin
  source?: Source
  private detach?: () => void
  private disposers = new Disposers()
  private holds: Holds
  private injections: Injections
  private lifecycle: Lifecycle
  private queue: TaskQueue
  private syncing = false

  constructor(
    readonly app: App,
    readonly parent: Scope | undefined,
    readonly layer: Layer,
    private mounted: Mount = {},
  ) {
    this.plugin = mounted.plugin
    this.status = this.kind === 'plugin' ? 'pending' : 'active'
    this.holds = new Holds(() => app.release())
    this.injections = new Injections(layer, () => this.plugin?.inject ?? [])
    this.lifecycle = new Lifecycle(this, mounted, this.disposers, this.injections)
    this.queue = new TaskQueue(error => app.report(this, error))
    this.ctx = createContext(this)
    app.scopes.add(this)
    parent?.children.add(this)
  }

  get kind(): Kind {
    if (this.mounted.plugin || this.mounted.path) return 'plugin'
    return this.parent ? 'layer' : 'root'
  }

  get name(): string {
    return this.plugin?.name ?? (this.mounted.path ? basename(this.mounted.path) : (this.parent?.name ?? 'root'))
  }

  get address(): string {
    if (!this.parent) return ''
    return `${this.parent.address}/${this.mounted.path ?? this.mounted.plugin?.name ?? `#${this.id}`}`
  }

  get hot() {
    return { data: this.app.hotData(this.address) }
  }

  get base(): string {
    return this.source?.dir ?? this.parent?.base ?? this.app.loader?.cwd() ?? ''
  }

  track(dispose: Dispose) {
    return this.disposers.add(dispose)
  }

  hold() {
    return this.holds.take()
  }

  missing() {
    return this.injections.missing()
  }

  injects(key: ServiceKey) {
    return this.injections.includes(key)
  }

  mount(mount: Mount) {
    return this.adopt(new Scope(this.app, this, this.layer, mount)).sync()
  }

  branch() {
    return this.adopt(new Scope(this.app, this, new Layer(this.app, this.layer)))
  }

  settled() {
    return this.queue.settled
  }

  quiet(): boolean {
    return this.holds.idle && [...this.children].every(child => child.quiet())
  }

  async idle() {
    while (!this.quiet()) await this.app.released()
  }

  sync() {
    if (this.syncing) return this
    this.syncing = true
    this.queue.run(async () => {
      this.syncing = false
      await this.lifecycle.sync()
    })
    return this
  }

  reload() {
    return this.queue.run(() => this.lifecycle.reload())
  }

  fail(error: unknown) {
    if (this.kind !== 'plugin') return this.app.report(this, error)
    this.queue.run(() => this.lifecycle.crash(error))
  }

  dispose() {
    return this.queue.run(async () => {
      if (this.status === 'disposed') return
      await this.lifecycle.teardown()
      this.app.scopes.delete(this)
      this.parent?.children.delete(this)
      this.detach?.()
    })
  }

  private adopt(child: Scope) {
    child.detach = this.track(() => child.dispose())
    return child
  }
}
