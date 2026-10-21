import { errorMessage } from '@sand/util'
import type { Context, ScopeView } from 'drydock'

const problemOf = (scope: ScopeView) => {
  if (scope.status === 'pending') return [`${scope.name} is waiting for: ${scope.missing().join(', ')}`]
  if (scope.status === 'failed') return [`${scope.name} failed: ${errorMessage(scope.error)}`]
  return []
}

export const problems = (ctx: Context) =>
  ctx
    .scopes()
    .filter(scope => scope.kind === 'plugin')
    .flatMap(problemOf)
