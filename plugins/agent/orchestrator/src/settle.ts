import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { OrchestratorContext } from './context'
import { helloSettleDays, settleDaysChange, settleDaysSet } from './contract'

const TABLE = ['plugins', 'orchestrator']

export const serveSettle = (ctx: OrchestratorContext, initial: number) => {
  let days = initial
  return ctx.watch(
    server,
    found =>
      found &&
      joinDisposers(
        found.hello(helloSettleDays, () => days),
        found.handle(settleDaysSet, async ({ days: next }) => {
          await ctx.sandConfig.set(TABLE, { settle_days: next })
          days = next
          found.broadcast(settleDaysChange, next)
          return next
        }),
      ),
  )
}
