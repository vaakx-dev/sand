import { kit } from '@sand/ui-kit/contract'
import { fileIndex, machines, projects, threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export const inject = { projects, machines, threads, kit, fileIndex }

export type ProjectsContext = Context<typeof inject>

export type FindContext = Context<Pick<typeof inject, 'threads' | 'fileIndex'>>
