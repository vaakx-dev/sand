import type { Context, ScopeView } from 'drydock'

const errorText = (error: unknown) =>
  error instanceof Error ? (error.stack ?? error.message).split('\n').slice(0, 8).join('\n') : String(error)

const line = (scope: ScopeView, depth: number): string[] => {
  const missing = scope.missing()
  return [
    `${'  '.repeat(depth)}${scope.name}: ${scope.status}${scope.status === 'pending' && missing.length ? ` (waiting for ${missing.join(', ')})` : ''}`,
    ...(scope.error === undefined ? [] : [errorText(scope.error)]),
    ...[...scope.children].filter(child => child.kind === 'plugin').flatMap(child => line(child, depth + 1)),
  ]
}

export const describe = (ctx: Context, scope: ScopeView) => {
  const services = ctx.inspector?.services().filter(service => service.provider === scope.name && service.active) ?? []
  const hooks = ctx.inspector?.hooks().filter(hook => hook.handlers.some(handler => handler.plugin === scope.name)) ?? []
  return [
    ...line(scope, 0),
    services.length ? `provides: ${services.map(service => service.key).join(', ')}` : '',
    hooks.length ? `hooks: ${hooks.map(hook => hook.name).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
