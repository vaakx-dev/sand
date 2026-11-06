import { pluginProblems } from '@sand/config/contract'
import { errorMessage } from '@sand/util'
import { scopeError, type Context } from 'drydock'
import type { FailedPlugin } from '../contract'

export const createFailures = (ctx: Context) => {
  const reported: FailedPlugin[] = []
  let collecting = true

  ctx.on(scopeError, (scope, error) => {
    if (collecting) reported.push({ id: scope.name, error: errorMessage(error) })
  })

  const list = (): FailedPlugin[] => {
    const seen = new Map<string, FailedPlugin>()
    for (const problem of [...pluginProblems(ctx), ...reported]) seen.set(`${problem.id}\n${problem.error}`, problem)
    return [...seen.values()]
  }

  return {
    list,
    stop() {
      collecting = false
    },
  }
}
