import type { Scope } from '../scope/scope'
import type { ServiceKey } from '../services/types'
import { Watcher } from '../services/watcher'
import type { Context, ContextCore, Dispose } from './types'

const owners = new WeakMap<object, Scope>()

export const scopeOf = (ctx: ContextCore) => {
  const scope = owners.get(ctx)
  if (!scope) throw new Error('Not a drydock context')
  return scope
}

export const createContext = (scope: Scope): Context => {
  const { app } = scope

  const own = (dispose: Dispose) => {
    const untrack = scope.track(dispose)
    return () => {
      untrack()
      return dispose()
    }
  }

  const reload = async (target: unknown) => {
    const found = [...app.scopes].find(candidate => candidate === target)
    if (found && found.kind !== 'plugin') throw new Error(`${found.name} is not a plugin, so it cannot be reloaded`)
    await found?.reload()
  }

  const core: ContextCore = {
    get scope() {
      return scope
    },
    get hot() {
      return scope.hot
    },
    provide(key, impl) {
      if (key in core) throw new Error(`"${key}" is a ctx method, so it cannot name a service`)
      return own(scope.layer.provide(key, impl, scope))
    },
    watch(key, use) {
      const watcher = new Watcher(scope, key, use)
      app.watchers.add(watcher)
      const dispose = own(() => {
        app.watchers.delete(watcher)
        watcher.release()
      })
      watcher.fire()
      return dispose
    },
    plugin: (plugin, config) => scope.mount({ plugin, config }),
    load: (path, config) => scope.mount({ path, config }),
    layer: () => scope.branch().ctx,
    on: (name, handler, options) => own(app.bus.on(name, handler, scope, options)),
    emit: (name, ...args) => app.bus.emit(name, args),
    waterfall: (name, ...args) => app.bus.waterfall(name, args) as never,
    bail: (name, ...args) => app.bus.bail(name, args) as never,
    effect: setup => own(setup() ?? (() => {})),
    busy: () => own(scope.hold()),
    report: error => app.report(scope, error),
    scopes: () => [...app.scopes],
    reload: (target = scope) => reload(target),
    settled: () => app.settled(),
    dispose: () => scope.dispose(),
  }

  const ctx = new Proxy(core, {
    get: (target, key, receiver) =>
      key in target || typeof key !== 'string'
        ? Reflect.get(target, key, receiver)
        : scope.layer.resolve(key as ServiceKey),
  }) as Context
  owners.set(ctx, scope)
  return ctx
}
