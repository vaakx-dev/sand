import type { App } from '../app/app'
import type { Scope } from '../scope/scope'
import type { HookInfo, ScopeNode, ServiceInfo } from './types'

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const tree = (scope: Scope): ScopeNode => ({
  id: scope.id,
  name: scope.name,
  kind: scope.kind,
  status: scope.status,
  ...(scope.error === undefined ? {} : { error: message(scope.error) }),
  ...(scope.plugin?.description === undefined ? {} : { description: scope.plugin.description }),
  inject: [...(scope.plugin?.inject ?? [])],
  uses: { ...scope.plugin?.uses },
  children: [...scope.children].map(tree),
})

export const services = (app: App): ServiceInfo[] => {
  const layers = new Set([...app.scopes].map(scope => scope.layer))
  return [...layers].flatMap(layer =>
    layer.list().map(({ key, scope, active }) => ({ layer: layer.id, key, provider: scope.name, active })),
  )
}

export const hooks = (app: App): HookInfo[] =>
  app.bus.names().map(name => ({
    name,
    handlers: app.bus.list(name).map(hook => ({ plugin: hook.scope.name, priority: hook.priority })),
  }))
