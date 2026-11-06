import { cli } from '@sand/config/contract'
import { runtime } from '@sand/host-runtimes/contract'
import type { Context } from 'drydock'

export const inject = { cli, runtime }

export type ServerContext = Context<typeof inject>
