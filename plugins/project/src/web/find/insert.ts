import { composer } from '@sand/composer/contract'
import type { Context } from 'drydock'

const mention = (path: string) => (/\s/.test(path) ? `@"${path}" ` : `@${path} `)

export const insertFile = (ctx: Context, path: string) => {
  const found = ctx.get(composer)
  if (!found) return
  found.insert(mention(path))
  found.focus()
}
