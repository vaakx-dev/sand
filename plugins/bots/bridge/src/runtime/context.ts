import { botTurns } from '@sand/bot-turns/contract'
import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { entryViews } from '@sand/engine/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import type { Context } from 'drydock'

export const inject = { bots, botTurns, entryViews, sessions, orchestrator }

export type BridgeContext = Context<typeof inject>
