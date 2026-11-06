import { composer } from '@sand/composer/contract'
import { wire } from '@sand/devices-contract'
import { transcriptParts } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import type { Context } from 'drydock'

export const inject = { kit, wire, transcriptParts, composer }

export type BotsContext = Context<typeof inject>
