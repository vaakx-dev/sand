import type { ServerContext } from '../context'

export const openSession = (ctx: ServerContext, id: string) => {
  const found = ctx.sessions.open(id)
  if (!found) throw new Error(`No thread ${id}`)
  return found
}
