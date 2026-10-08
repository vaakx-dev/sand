import type { Context } from 'drydock'

const mention = (path: string) => (/\s/.test(path) ? `@"${path}" ` : `@${path} `)

export const insertFile = (ctx: Context, path: string) => {
  if (!ctx.composer) return ctx.notify?.push('No composer is loaded to add the file to', { level: 'error' })
  ctx.composer.insert(mention(path))
  ctx.composer.focus()
}
