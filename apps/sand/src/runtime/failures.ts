import type { FailedPlugin } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import type { Context } from 'drydock'

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

  ctx.on('drydock.error', (scope, error) => {
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
