import type { Entry } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import { errorMessage } from '@sand/kit'
import { previousLoop, type Choice } from './choice'
import type { LoopsContext } from './context'
import type { LoopImpl } from './contract'
import { fallbackLoop } from './defaults'
import type { Registry } from './registry'

const limit = 2

export const faultType = 'loop-fault'

export interface LoopFault {
  name: string
  error: string
  count: number
}

const earlierFaults = (session: Session, opening: Entry, name: string) => {
  const path = session.path()
  const start = path.findIndex(entry => entry.id === opening.id)
  for (const entry of (start < 0 ? path : path.slice(0, start)).reverse()) {
    if (entry.type === 'message' || entry.type === 'loop') return 0
    if (entry.type !== faultType) continue
    const fault = entry.data as LoopFault
    return fault.name === name ? fault.count : 0
  }
  return 0
}

export const createFaults = (ctx: LoopsContext, registry: Registry, choice: Choice) => {
  const fallBack = (session: Session, impl: LoopImpl, reason: string) => {
    registry.quarantine(impl.name, reason)
    choice.record(session, previousLoop(session, impl.name), reason)
    const now = choice.state(session)
    ctx.ui?.notify(
      `Loop ${impl.name} failed twice and this thread is back on ${now.name}. To undo the plugin change, open Settings › Plugins › ${impl.plugin ?? impl.name} › History.`,
      'error',
    )
  }

  return {
    fault(session: Session, impl: LoopImpl, error: unknown, opening: Entry) {
      if (impl.name === fallbackLoop) return
      const message = errorMessage(error)
      const count = earlierFaults(session, opening, impl.name) + 1
      session.append(faultType, { name: impl.name, error: message, count } satisfies LoopFault)
      if (count >= limit) fallBack(session, impl, `${impl.name} failed twice: ${message}`)
    },
  }
}

export type Faults = ReturnType<typeof createFaults>
