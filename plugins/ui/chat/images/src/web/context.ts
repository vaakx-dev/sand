import { kit } from '@sand/ui-kit/contract'
import { media, threads, wire } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { wire, threads, media, kit }

export type ImagesContext = Context<typeof inject>
