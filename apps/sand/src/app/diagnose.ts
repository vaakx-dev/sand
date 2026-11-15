import { coreProblems } from '@sand/config/contract'
import type { Context } from 'drydock'

export const problems = (ctx: Context) => coreProblems(ctx).map(problem => `${problem.id}: ${problem.error}`)
