import { pcs } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { fileIndex, projects, threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { projects, pcs, threads, kit, fileIndex }

export type ProjectsContext = Context<typeof inject>

export type FindContext = Context<Pick<typeof inject, 'threads' | 'fileIndex'>>
