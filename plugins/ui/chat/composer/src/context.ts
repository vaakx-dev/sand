import { kit } from '@sand/ui-kit/contract'
import { threads, turns } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { threads, turns, kit }

export type ComposerContext = Context<typeof inject>
