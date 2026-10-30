import { mediaView } from '@sand/media/web/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { threads, mediaView, kit }

export type ImagesContext = Context<typeof inject>
