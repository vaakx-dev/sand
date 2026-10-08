import type { Scope } from '../scope/scope'
import { order } from './order'
import type { HookOptions } from './types'

export interface Hook {
  name: string
  handler: (...args: any[]) => unknown
  scope: Scope
  priority: number
  before: string[]
  after: string[]
}

export interface TraceRecord {
  kind: 'emit' | 'waterfall' | 'bail'
  name: string
  at: number
  ms: number
  handlers: string[]
  failed: string[]
}

export class Bus {
  private hooks = new Map<string, Hook[]>()
  private ordered = new Map<string, Hook[]>()
  private observers = new Set<(record: TraceRecord) => void>()

  on(name: string, handler: Hook['handler'], scope: Scope, options: HookOptions = {}) {
    const hook = {
      name,
      handler,
      scope,
      priority: options.priority ?? 0,
      before: options.before ?? [],
      after: options.after ?? [],
    }
    this.update(name, [...(this.hooks.get(name) ?? []), hook])
    return () => this.update(name, (this.hooks.get(name) ?? []).filter(entry => entry !== hook))
  }

  has(name: string) {
    return Boolean(this.hooks.get(name)?.length)
  }

  names() {
    return [...this.hooks.keys()]
  }

  list(name: string) {
    let hooks = this.ordered.get(name)
    if (!hooks) this.ordered.set(name, (hooks = order(this.hooks.get(name) ?? [])))
    return hooks
  }

  observe(observer: (record: TraceRecord) => void) {
    this.observers.add(observer)
    return () => void this.observers.delete(observer)
  }

  emit(name: string, args: unknown[]) {
    const { hooks, guard, end } = this.begin('emit', name)
    for (const hook of hooks) {
      try {
        const result = hook.handler(...args)
        if (result instanceof Promise) result.catch(error => this.fail(hook, error))
      } catch (error) {
        guard(hook, error)
      }
    }
    end()
  }

  async waterfall(name: string, args: unknown[]) {
    let [value, ...rest] = args
    await this.sequence('waterfall', name, async hook => {
      const next = await hook.handler(value, ...rest)
      if (next !== undefined) value = next
    })
    return value
  }

  async bail(name: string, args: unknown[]) {
    let result: unknown
    await this.sequence('bail', name, async hook => {
      result = await hook.handler(...args)
      return result !== undefined
    })
    return result
  }

  private async sequence(kind: TraceRecord['kind'], name: string, step: (hook: Hook) => Promise<boolean | void>) {
    const { hooks, guard, end } = this.begin(kind, name)
    for (const hook of hooks) {
      try {
        if (await step(hook)) break
      } catch (error) {
        guard(hook, error)
      }
    }
    end()
  }

  private begin(kind: TraceRecord['kind'], name: string) {
    const started = performance.now()
    const hooks = this.list(name)
    const failed: Hook[] = []
    return {
      hooks,
      guard: (hook: Hook, error: unknown) => {
        failed.push(hook)
        this.fail(hook, error)
      },
      end: () => this.record(kind, name, started, hooks, failed),
    }
  }

  private update(name: string, hooks: Hook[]) {
    if (hooks.length) this.hooks.set(name, hooks)
    else this.hooks.delete(name)
    this.ordered.delete(name)
  }

  private fail(hook: Hook, error: unknown) {
    if (hook.name === 'drydock.error') console.error('[drydock] error handler failed:', error)
    else hook.scope.fail(error)
  }

  private record(kind: TraceRecord['kind'], name: string, started: number, hooks: Hook[], failed: Hook[]) {
    if (!this.observers.size) return
    const record = {
      kind,
      name,
      at: Date.now(),
      ms: performance.now() - started,
      handlers: hooks.map(hook => hook.scope.name),
      failed: failed.map(hook => hook.scope.name),
    }
    for (const observer of this.observers) observer(record)
  }
}
