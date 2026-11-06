import { botTurns } from '@sand/bot-turns/contract'
import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { engine, entryViews } from '@sand/engine/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { projectFiles } from '@sand/project/contract'
import type { Context } from 'drydock'

export const inject = { bots, botTurns, engine, entryViews, sessions, orchestrator, projectFiles }

export type BridgeContext = Context<typeof inject>
