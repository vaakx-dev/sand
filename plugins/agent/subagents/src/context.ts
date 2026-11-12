import { sessions } from '@sand/chats/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import { paths } from '@sand/paths/contract'
import { tools } from '@sand/tools/contract'
import { watcher } from '@sand/watch/contract'
import type { Context } from 'drydock'

export const inject = { paths, sessions, tools, watcher, orchestrator }

export type AgentsContext = Context<typeof inject>
