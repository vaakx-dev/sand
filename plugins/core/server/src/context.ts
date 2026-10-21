import { sessions } from '@sand/chats/contract'
import { cli } from '@sand/config/contract'
import { runtime } from '@sand/host-runtimes/contract'
import { loop } from '@sand/loop/contract'
import type { Context } from 'drydock'

export const inject = { cli, sessions, loop, runtime }

export type ServerContext = Context<typeof inject>
