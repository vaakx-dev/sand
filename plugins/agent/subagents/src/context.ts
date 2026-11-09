import { sessions } from '@sand/chats/contract'
import { backgroundJobs } from '@sand/jobs/contract'
import { paths } from '@sand/paths/contract'
import { tools } from '@sand/tools/contract'
import { turns } from '@sand/turns-contract/contract'
import { watcher } from '@sand/watch/contract'
import type { Context } from 'drydock'

export const inject = { turns, paths, sessions, tools, watcher, backgroundJobs }

export type AgentsContext = Context<typeof inject>
