import { llm } from '@sand/accounts/contract'
import { sessions } from '@sand/chats/contract'
import { sandConfig } from '@sand/config/contract'
import { ledger } from '@sand/ledger/contract'
import { paths } from '@sand/paths/contract'
import { turns } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { createBots } from './bots'
import { bots } from './contract'
import { schema } from './schema'
import { serveBots } from './serve'

const TABLE = ['plugins', 'bots']

export default definePlugin({
  name: 'bots',
  description: "Keeps each bot's profile and jobs in tables of their own, and its one ongoing chat as a session; bots the user hasn't talked to for settle_days settle at the back of the list",
  inject: { paths, ledger, llm, sessions, turns, sandConfig },
  config: z.object({ settle_days: z.number().int().min(1).max(365).default(3) }).default({ settle_days: 3 }),
  apply(ctx, { settle_days }) {
    const root = join(ctx.paths.home, 'bots')
    let settleDays = settle_days
    ctx.ledger.migrate('bots', schema(root))
    const service = createBots(ctx, { ledger: ctx.ledger, root, llm: ctx.llm, sessions: ctx.sessions, turns: ctx.turns, settleDays: () => settleDays })
    ctx.provide(bots, service)
    serveBots(ctx, service, {
      days: () => settleDays,
      async set(days) {
        await ctx.sandConfig.set(TABLE, { settle_days: days })
        settleDays = days
      },
    })
  },
})
