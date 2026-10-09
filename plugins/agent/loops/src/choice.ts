import type { Entry } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { LoopsContext } from './context'
import type { LoopChoice, LoopImpl, LoopState } from './contract'
import { fallbackLoop, type Defaults } from './defaults'
import type { Registry } from './registry'

const nameOf = (entry: Entry | undefined) => {
  const name = (entry?.data as LoopChoice | undefined)?.name
  return typeof name === 'string' && name ? name : null
}

const loopEntries = (session: Session) => session.path().filter(entry => entry.type === 'loop')

export const chosenLoop = (session: Session) => nameOf(loopEntries(session).at(-1))

export const previousLoop = (session: Session, name: string) => {
  const entries = loopEntries(session)
  if (nameOf(entries.at(-1)) !== name) return null
  return nameOf(entries.findLast(entry => nameOf(entry) !== name))
}

export const createChoice = (ctx: LoopsContext, registry: Registry, defaults: Defaults) => {
  const pick = (session: Session) => {
    const chosen = chosenLoop(session)
    const wanted = chosen ?? defaults.get()
    const impl = registry.usable(ctx.cli.safe ? fallbackLoop : wanted) ?? registry.get(fallbackLoop)
    return { chosen, wanted, impl }
  }

  const state = (session: Session): LoopState => {
    const { chosen, wanted, impl } = pick(session)
    const name = impl?.name ?? fallbackLoop
    return { name, label: impl?.label ?? name, chosen, ...(name !== wanted && { fallback: wanted }) }
  }

  const record = (session: Session, name: string | null, reason?: string) => {
    session.append('loop', { name, ...(reason && { reason }) } satisfies LoopChoice)
    ctx.emit('loop.change', session, state(session))
  }

  return {
    resolve(session: Session): LoopImpl {
      const { impl } = pick(session)
      if (!impl) throw new Error('No agent loop is loaded')
      return impl
    },
    state,
    record,
    choose(session: Session, name: string | null, reason?: string) {
      if (name !== null && !registry.get(name)) throw new Error(`No agent loop named ${name}`)
      const blocked = name !== null && registry.quarantined(name)
      if (blocked) throw new Error(`The ${name} loop is switched off until sand restarts: ${blocked}`)
      record(session, name, reason)
    },
  }
}

export type Choice = ReturnType<typeof createChoice>
