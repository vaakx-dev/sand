import type { Context } from 'drydock'
import { runtimeRelease } from '../contract'

export const createOwnership = (ctx: Context) => {
  let current = false
  const held = new Set<string>()

  return {
    owns: (session: string) => current && !held.has(session),
    promote(sessions: string[]) {
      current = true
      for (const id of sessions) held.add(id)
    },
    drain() {
      current = false
    },
    release(sessions: string[]) {
      for (const id of sessions) held.delete(id)
      ctx.emit(runtimeRelease, sessions)
    },
  }
}
