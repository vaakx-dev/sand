import { errorMessage } from '@sand/dom'
import type { Context } from 'drydock'

export const reportFailure = (ctx: Context, error: unknown) => {
  if (ctx.notify) ctx.notify.push(errorMessage(error), { level: 'error' })
  else console.error(error)
}
