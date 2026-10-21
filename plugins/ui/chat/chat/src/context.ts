import { markdown } from '@sand/markdown/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads, turns } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, threads, turns, markdown }

export type ChatContext = Context<typeof inject>
