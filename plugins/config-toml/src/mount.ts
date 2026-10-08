import type { Context } from 'drydock'

export const mounter = (ctx: Context, locate: (id: string) => string) => (id: string, options: unknown) => {
  try {
    ctx.load(locate(id), options)
  } catch (error) {
    ctx.report(error)
  }
}
