import { type CliPlace, type Provider, providersIn } from '@sand/config/contract'
import { errorMessage } from '@sand/util'
import type { Context, Scope, ScopeView } from 'drydock'
import { join, resolve } from 'node:path'

type PluginOptions = Record<string, Record<string, unknown>>

interface Manifest {
  name: string
  sand?: Record<string, unknown>
}

interface Place {
  app: Context
  builtins: string
  place: CliPlace
  options?: PluginOptions
}

const manifestOf = (dir: string): Promise<Manifest> => Bun.file(join(dir, 'package.json')).json()

const waiting = (app: Context) => app.scopes().filter(scope => scope.kind === 'plugin' && scope.status === 'pending')

class Plugins {
  private readonly mounted = new Map<string, Scope | undefined>()
  private readonly claimed = new Map<string, Scope | undefined>()
  private providers?: Map<string, Provider>

  constructor(private readonly at: Place) {}

  mount(id: string, entry: string) {
    if (this.claimed.has(id)) return this.claimed.get(id)
    const scope = this.at.app.load(entry, this.at.options?.[id] ?? {})
    this.claimed.set(id, scope)
    return scope
  }

  async load(folders: string[]) {
    const dirs = folders.map(folder => resolve(this.at.builtins, folder))
    const scopes = this.pull(dirs, await Promise.all(dirs.map(manifestOf)))
    const missing = folders.filter((_, index) => !scopes[index])
    if (missing.length) throw new Error(`${missing.join(', ')} has no ${this.at.place} entry`)
  }

  private pull(dirs: string[], manifests: Manifest[]) {
    return dirs.map((dir, index) => {
      if (this.mounted.has(dir)) return this.mounted.get(dir)
      const { name, sand } = manifests[index]!
      const entry = sand?.[this.at.place]
      const id = name.replace(/^@sand\//, '')
      const scope = typeof entry === 'string' ? this.mount(id, resolve(dir, entry)) : this.claimed.get(id)
      this.mounted.set(dir, scope)
      return scope
    })
  }

  async start() {
    await this.at.app.settled()
    const stuck = waiting(this.at.app)
    if (!stuck.length) return
    const providers = (this.providers ??= await providersIn(this.at.builtins))
    const needed = stuck.flatMap(scope => scope.missing()).flatMap(service => providers.get(service)?.dir ?? [])
    const fresh = [...new Set(needed)].filter(dir => !this.mounted.has(dir))
    if (!fresh.length) throw new Error(`Plugins could not start:\n${stuck.map(scope => this.unmet(scope, providers)).join('\n')}`)
    this.pull(fresh, await Promise.all(fresh.map(manifestOf)))
    await this.start()
  }

  private unmet(scope: ScopeView, providers: Map<string, Provider>) {
    const reasons = scope.missing().map(service => `${service} (${this.reason(providers.get(service))})`)
    return `  ${scope.name} needs ${reasons.join(', ')}`
  }

  private reason(provider: Provider | undefined) {
    if (!provider) return 'no plugin provides it'
    const scope = this.mounted.get(provider.dir)
    if (!scope) return `${provider.id} provides it but has no ${this.at.place} entry`
    if (scope.status === 'failed') return `${provider.id} failed: ${errorMessage(scope.error)}`
    return `${provider.id} is ${scope.status}`
  }
}

export { Plugins, type PluginOptions }
