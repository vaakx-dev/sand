import { llm } from '@sand/accounts/contract'
import { ledger } from '@sand/ledger/contract'
import { modelSettings } from '@sand/model/contract'
import { paths } from '@sand/paths/contract'
import { subModel } from '@sand/sub-model/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { createBots } from './bots'
import { bots, type ModelChoice } from './contract'
import { quickChoice } from './quick'
import { schema } from './schema'
import { serveBots } from './serve'

export default definePlugin({
  name: 'bots',
  description: "Keeps each bot's profile and its one ongoing conversation in tables of their own",
  inject: { paths, ledger, llm },
  apply(ctx) {
    ctx.ledger.migrate('bots', schema)
    const quick = (main: ModelChoice): ModelChoice => {
      const sub = ctx.get(subModel)
      if (sub?.has('fast')) {
        const { model, effort } = sub.settings('fast')
        return { model, ...(effort && { effort }) }
      }
      const catalog = { models: ctx.llm.models?.() ?? [], price: (model: string) => ctx.llm.price?.(model) }
      return quickChoice(catalog, main.model ?? ctx.get(modelSettings)?.defaults().model)
    }
    const service = createBots(ctx, ctx.ledger, join(ctx.paths.home, 'bots'), quick)
    ctx.provide(bots, service)
    serveBots(ctx, service)
  },
})
