import { copyText } from '@sand/dom'
import type { Context } from 'drydock'

export const copyWithNotice = (ctx: Context<'wire'>, text: string, what: string) => async () => {
  const copied = await copyText(text)
  ctx.notify?.push(copied ? `Copied ${what}` : `Could not copy the ${what}`, { level: copied ? 'info' : 'error' })
}
