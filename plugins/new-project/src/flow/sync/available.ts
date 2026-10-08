import type { FlowContext } from '../types'

export const syncOf = (ctx: FlowContext) => {
  const sync = ctx.sync
  if (!sync) ctx.notify?.push('Project sync is not available', { level: 'error' })
  return sync
}
