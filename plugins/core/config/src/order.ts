import { scopeStatus, type Context, type ScopeView } from 'drydock'

export const startOrder = (ctx: Context) => {
  const started = new Set<ScopeView>()
  ctx.on(scopeStatus, scope => {
    if (scope.status === 'starting' || scope.status === 'disposed') started.delete(scope)
    if (scope.status === 'starting') started.add(scope)
  })
  return <T extends ScopeView>(entries: [string, T][]) => {
    const order = [...started]
    return entries.sort(([, a], [, b]) => order.indexOf(b) - order.indexOf(a))
  }
}
