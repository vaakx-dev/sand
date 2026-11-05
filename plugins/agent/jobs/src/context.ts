import { sessions } from '@sand/chats/contract'
import { tools } from '@sand/tools/contract'
import { turns } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'

export const inject = { turns, sessions, tools }

export type JobsContext = Context<typeof inject>
