import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { entryViews } from '@sand/engine/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { turns } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'

export const inject = { bots, turns, entryViews, sessions, orchestrator }

export type BridgeContext = Context<typeof inject>
