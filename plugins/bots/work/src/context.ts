import { composer } from '@sand/composer/contract'
import { wire } from '@sand/devices-contract'
import { transcriptParts } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads, turns } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { kit, wire, threads, turns, transcriptParts, composer }

export type WorkContext = Context<typeof inject>
