import { errorMessage } from '@sand/kit'
import type { Context } from 'drydock'

export type ProjectsContext = Context<'projects' | 'machines' | 'threads' | 'kit'>

export const reportError = (ctx: ProjectsContext, error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
