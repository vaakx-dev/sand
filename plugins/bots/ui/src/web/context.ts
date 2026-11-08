import { composer } from '@sand/composer/contract'
import { wire } from '@sand/devices-contract'
import { markdown } from '@sand/markdown/contract'
import { transcriptParts } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import type { Context } from 'drydock'

export const inject = { kit, wire, shell, markdown, transcriptParts, composer }

export type BotsContext = Context<typeof inject>
