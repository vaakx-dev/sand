import { llm } from '@sand/accounts/contract'
import { sessions } from '@sand/chats/contract'
import { ledger } from '@sand/ledger/contract'
import { paths } from '@sand/paths/contract'
import { turns } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { createBots } from './bots'
import { bots } from './contract'
import { schema } from './schema'
import { serveBots } from './serve'

export default definePlugin({
  name: 'bots',
  description: "Keeps each bot's profile and jobs in tables of their own, and its one ongoing chat as a session",
  inject: { paths, ledger, llm, sessions, turns },
  apply(ctx) {
    const root = join(ctx.paths.home, 'bots')
    ctx.ledger.migrate('bots', schema(root))
    const service = createBots(ctx, { ledger: ctx.ledger, root, llm: ctx.llm, sessions: ctx.sessions, turns: ctx.turns })
    ctx.provide(bots, service)
    serveBots(ctx, service)
  },
})
