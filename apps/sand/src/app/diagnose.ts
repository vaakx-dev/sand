import { pluginProblems } from '@sand/config/contract'
import type { Context } from 'drydock'

export const problems = (ctx: Context) => pluginProblems(ctx).map(problem => `${problem.id}: ${problem.error}`)
