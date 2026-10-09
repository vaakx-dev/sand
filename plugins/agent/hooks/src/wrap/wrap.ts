import { errorMessage } from '@sand/kit'
import type { NoticeLevel } from '@sand/server/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { HookName } from '../contract'
import type { TraceBook } from '../trace'
import { sessionArg, timeoutOf } from './args'
import { outcomeOf, type Outcome } from './outcome'

export interface HookSlot {
  name: HookName
  off?: string
  timeouts: number
}

export interface WrapEnv {
  source: string
  book: TraceBook
  matches(session: Session | undefined): boolean
  notify(text: string, level?: NoticeLevel): void
  slow(): boolean
}

type AnyHandler = (...args: unknown[]) => unknown

const timedOut = Symbol('timed out')
const maxTimeouts = 3
const toolActions = new Set(['allow', 'deny', 'ask', 'rewrite'])

const withTimeout = (work: Promise<unknown>, ms: number) => {
  let timer: Timer | undefined
  const limit = new Promise<typeof timedOut>(resolve => (timer = setTimeout(() => resolve(timedOut), ms)))
  return Promise.race([work, limit]).finally(() => clearTimeout(timer))
}

const invalid = (name: HookName, result: unknown) =>
  name === 'tool.before' && result !== undefined && !toolActions.has((result as { action?: string } | null)?.action ?? '')

export const wrapHandler = (env: WrapEnv, slot: HookSlot, handler: AnyHandler, timeout?: number) => {
  const { name } = slot
  const ms = timeoutOf(name, timeout)
  const label = `Hook ${env.source} › ${name}`

  return (...args: unknown[]) => {
    if (slot.off) return undefined
    const session = sessionArg(name, args)
    if (!env.matches(session)) return undefined
    const trace = env.book.current(session)
    const started = performance.now()
    const record = (outcome: Outcome) =>
      trace?.records.push({ hook: name, source: env.source, ...outcome, ms: Math.round(performance.now() - started) })

    const fail = (error: unknown) => {
      const message = errorMessage(error)
      slot.off = `failed: ${message}`
      record({ outcome: 'failed', detail: message })
      env.notify(`${label} failed and is off until you edit the file: ${message}`, 'error')
      return undefined
    }

    const skip = () => {
      slot.timeouts++
      record({ outcome: 'skipped', detail: `took over ${ms} ms` })
      if (slot.timeouts >= maxTimeouts) {
        slot.off = `timed out ${maxTimeouts} times in a row`
        env.notify(`${label} timed out ${maxTimeouts} times in a row and is off until you edit the file`, 'error')
      } else if (env.slow()) env.notify(`${label} took over ${ms} ms and was skipped`)
      return undefined
    }

    const finish = (result: unknown) => {
      if (invalid(name, result)) return fail(new Error('returned a decision without a valid action'))
      slot.timeouts = 0
      const outcome = outcomeOf(name, args, result)
      if (outcome) record(outcome)
      return result
    }

    let result: unknown
    try {
      result = handler(...args)
    } catch (error) {
      return fail(error)
    }
    if (!(result instanceof Promise)) return finish(result)
    const settled = withTimeout(result, ms).then(value => (value === timedOut ? skip() : finish(value)), fail)
    trace?.track(settled)
    return settled
  }
}
