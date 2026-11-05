import type { OrchestratorContext } from './context'
import { failure } from './contract'

export const findThread = (ctx: OrchestratorContext, id: string) => {
  const found = ctx.sessions.open(id)
  if (!found) throw failure('not_found', `No thread ${id}`)
  return found
}
