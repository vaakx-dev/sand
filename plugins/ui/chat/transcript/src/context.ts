import { markdown } from '@sand/markdown/contract'
import { kit } from '@sand/ui-kit/contract'
import type { Context } from 'drydock'

export const inject = { kit, markdown }

export type TranscriptContext = Context<typeof inject>
