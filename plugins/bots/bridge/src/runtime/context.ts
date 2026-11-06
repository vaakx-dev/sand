import { botTurns } from '@sand/bot-turns/contract'
import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { engine, entryViews } from '@sand/engine/contract'
import { ledger } from '@sand/ledger/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { projectFiles } from '@sand/project/contract'
import { tools } from '@sand/tools/contract'
import { turns } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'

export const inject = { bots, botTurns, engine, entryViews, sessions, turns, orchestrator, projectFiles, tools, ledger }

export type BridgeContext = Context<typeof inject>
