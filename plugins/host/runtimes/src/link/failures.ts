import { errorMessage } from '@sand/util'
import { scopeError, type Context } from 'drydock'
import type { FailedPlugin } from '../contract'

const scopeProblems = (ctx: Context): FailedPlugin[] =>
  ctx.scopes().flatMap(scope => {
    if (scope.kind !== 'plugin') return []
    if (scope.status === 'failed') return [{ id: scope.name, error: errorMessage(scope.error) }]
    if (scope.status === 'pending') return [{ id: scope.name, error: `waiting for: ${scope.missing().join(', ')}` }]
    return []
  })

export const createFailures = (ctx: Context) => {
  const reported: FailedPlugin[] = []
  let collecting = true

  ctx.on(scopeError, (scope, error) => {
    if (collecting) reported.push({ id: scope.name, error: errorMessage(error) })
  })

  const list = (): FailedPlugin[] => {
    const seen = new Map<string, FailedPlugin>()
    for (const problem of [...scopeProblems(ctx), ...reported]) seen.set(`${problem.id}\n${problem.error}`, problem)
    return [...seen.values()]
  }

  return {
    list,
    stop() {
      collecting = false
    },
  }
}
