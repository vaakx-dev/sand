import { transcriptParts } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads, turns } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, threads, turns, transcriptParts }

export type ChatContext = Context<typeof inject>
