import { sessions } from '@sand/chats/contract'
import { loop } from '@sand/loop/contract'
import { tools } from '@sand/tools/contract'
import type { Context } from 'drydock'

export const inject = { loop, sessions, tools }

export type JobsContext = Context<typeof inject>
