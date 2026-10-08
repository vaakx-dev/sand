import type { AnyPlugin } from '../plugin/types'
import { validate } from '../schema/validate'
import type { Disposers } from './disposers'
import type { Injections } from './injections'
import type { Mount } from './mount'
import type { Scope } from './scope'
import type { Status } from './view'

export class Lifecycle {
  constructor(
    private scope: Scope,
    private mounted: Mount,
    private disposers: Disposers,
    private injections: Injections,
  ) {}

  async sync() {
    const { scope } = this
    if (scope.status !== 'pending' && scope.status !== 'active') return
    if (scope.status === 'active' && this.injections.current()) return
    if (scope.status === 'active') {
      await scope.idle()
      await this.stop()
    }
    await this.boot()
  }

  async reload() {
    const { scope } = this
    if (scope.status === 'disposed') return
    await scope.idle()
    await this.stop()
    if (scope.source) scope.app.loader?.evict(scope.source.dir)
    if (this.mounted.path) scope.plugin = undefined
    scope.error = undefined
    await this.boot()
  }

  async crash(error: unknown) {
    const { scope } = this
    if (scope.status === 'failed' || scope.status === 'disposed') return
    await this.flush()
    this.injections.clear()
    scope.error = error
    this.setStatus('failed')
    scope.app.report(scope, error)
  }

  async teardown() {
    await this.flush()
    this.setStatus('disposed')
  }

  private async boot() {
    const { scope } = this
    let plugin: AnyPlugin
    try {
      plugin = scope.plugin ??= await this.import()
    } catch (error) {
      return this.crash(error)
    }
    if (this.injections.missing().length) return this.setStatus('pending')
    this.injections.capture()
    this.setStatus('starting')
    try {
      await plugin.apply(scope.ctx, await validate(plugin.config, this.mounted.config))
      if (scope.status === 'starting') this.setStatus('active')
    } catch (error) {
      await this.crash(error)
    }
  }

  private import() {
    const { scope } = this
    const loader = scope.app.loader
    if (!loader) throw new Error(`Cannot load ${this.mounted.path}: this app has no plugin loader`)
    scope.source = loader.locate(this.mounted.path!, scope.parent?.base ?? loader.cwd())
    return loader.load(scope.source.entry)
  }

  private async stop() {
    this.setStatus('pending')
    await this.flush()
    this.injections.clear()
  }

  private flush() {
    return this.disposers.flush(error => this.scope.app.report(this.scope, error))
  }

  private setStatus(status: Status) {
    this.scope.status = status
    this.scope.app.bus.emit('drydock.status', [this.scope])
  }
}
