import type { Context } from 'drydock'

export const problems = (ctx: Context) => {
  if (ctx.ui) return []
  const stuck = ctx
    .scopes()
    .filter(scope => scope.kind === 'plugin' && scope.status === 'pending')
    .map(scope => `${scope.name} is waiting for: ${scope.missing().join(', ')}`)
  return ['no plugin provides the ui role, so sand cannot talk to you', ...stuck]
}
