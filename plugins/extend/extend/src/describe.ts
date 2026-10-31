import { pluginSwitches } from '@sand/config/contract'
import { type Context, inspector, type ScopeView } from 'drydock'

const errorText = (error: unknown) =>
  error instanceof Error ? (error.stack ?? error.message).split('\n').slice(0, 8).join('\n') : String(error)

export const offNote = (needs: string[]) => `off: needs ${needs.join(', ')}, which sand.toml turns off`

const waiting = (ctx: Context, scope: ScopeView) => {
  const missing = scope.missing()
  if (scope.status !== 'pending' || !missing.length) return ''
  const needs = ctx.get(pluginSwitches)?.needs(missing)
  return needs ? ` (${offNote(needs)})` : ` (waiting for ${missing.join(', ')})`
}

export const statusLine = (ctx: Context, scope: ScopeView) => `${scope.name}: ${scope.status}${waiting(ctx, scope)}`

const scopeTree = (ctx: Context, scope: ScopeView, depth: number): string[] => [
  `${'  '.repeat(depth)}${statusLine(ctx, scope)}`,
  ...(scope.error === undefined ? [] : [errorText(scope.error)]),
  ...[...scope.children].filter(child => child.kind === 'plugin').flatMap(child => scopeTree(ctx, child, depth + 1)),
]

export const describe = (ctx: Context, scope: ScopeView) => {
  const found = ctx.get(inspector)
  const services = found?.services().filter(service => service.provider === scope.name && service.active) ?? []
  const hooks = found?.hooks().filter(hook => hook.handlers.some(handler => handler.plugin === scope.name)) ?? []
  return [
    ...scopeTree(ctx, scope, 0),
    services.length ? `provides: ${services.map(service => service.id).join(', ')}` : '',
    hooks.length ? `hooks: ${hooks.map(hook => hook.id).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
