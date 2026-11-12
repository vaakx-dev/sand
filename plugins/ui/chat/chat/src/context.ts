import { transcriptParts } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { projects, threads, turns } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, threads, projects, turns, transcriptParts }

export type ChatContext = Context<typeof inject>
