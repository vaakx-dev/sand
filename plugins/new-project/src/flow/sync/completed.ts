import type { CopyDone, ProjectRef } from '@sand/protocol'
import { errorMessage } from '@sand/dom'
import type { FlowContext } from '../types'
import { pcName } from './names'

export const completed = async (ctx: FlowContext, name: string, to: ProjectRef, then?: CopyDone) => {
  ctx.notify?.push(`${name} is on ${pcName(ctx, to.device)}`)
  if (then) return void then(to)
  try {
    await ctx.threads.draft(to.path, to.device)
    ctx.composer?.focus()
  } catch (error) {
    ctx.notify?.push(errorMessage(error), { level: 'error' })
  }
}
