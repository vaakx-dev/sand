import { errorMessage } from '@sand/util'
import type { Dispose } from 'drydock'
import type { SshLinkState } from '../../contract'
import type { Answers } from '../askpass/answers'
import { cancelled, NeedsYou } from '../ssh/failure'

export interface OpenLink {
  lport: number
  rport: number
  closed: Promise<string>
  close(): void
}

export interface LinkStatus {
  state: SshLinkState
  error?: string
}

export interface SupervisorDeps {
  open(answers: Answers, signal: AbortSignal): Promise<OpenLink>
  background(): Answers
  publish(link: OpenLink): Dispose
  changed(): void
  needsYou(error: string): void
  sleep(ms: number, signal: AbortSignal): Promise<void>
  random(): number
  now(): number
}

interface Run {
  controller: AbortController
  outcome: PromiseWithResolvers<void>
}

const firstDelay = 1000
const longestDelay = 5 * 60_000
const stableFor = 60_000

const backoff = (failures: number, random: number) => Math.min(longestDelay, firstDelay * 2 ** failures) * (0.75 + random / 2)

export const createSupervisor = (deps: SupervisorDeps) => {
  let status: LinkStatus = { state: 'connecting' }
  let run: Run | undefined

  const set = (next: LinkStatus) => {
    status = next
    deps.changed()
  }

  const hold = async (link: OpenLink, signal: AbortSignal) => {
    const unpublish = deps.publish(link)
    const close = () => link.close()
    signal.addEventListener('abort', close, { once: true })
    const error = await link.closed
    signal.removeEventListener('abort', close)
    unpublish()
    return error
  }

  const loop = async (first: Answers | undefined, { controller: { signal }, outcome }: Run) => {
    let failures = 0
    let answers = first
    while (!signal.aborted) {
      set({ state: 'connecting' })
      const opened = await deps.open(answers ?? deps.background(), signal).then(
        link => ({ link }),
        (error: unknown) => ({ error }),
      )
      const asked = answers !== undefined
      answers = undefined
      if (signal.aborted) return
      if ('link' in opened) {
        outcome.resolve()
        set({ state: 'connected' })
        const since = deps.now()
        const error = await hold(opened.link, signal)
        if (signal.aborted) return
        if (deps.now() - since >= stableFor) failures = 0
        set({ state: 'failed', error })
      } else {
        outcome.reject(opened.error)
        const needsYou = opened.error instanceof NeedsYou
        set({ state: needsYou ? 'needs-you' : 'failed', error: errorMessage(opened.error) })
        if (needsYou && !asked) deps.needsYou(errorMessage(opened.error))
        if (needsYou) return
      }
      await deps.sleep(backoff(failures++, deps.random()), signal)
    }
  }

  const stop = () => {
    run?.controller.abort()
    run?.outcome.reject(cancelled())
    run = undefined
  }

  const connect = (answers?: Answers, signal?: AbortSignal) => {
    if (status.state === 'connected' && run) return Promise.resolve()
    stop()
    const current: Run = { controller: new AbortController(), outcome: Promise.withResolvers<void>() }
    run = current
    const quit = () => {
      if (run !== current) return
      stop()
      set({ state: 'needs-you', error: 'Cancelled' })
    }
    signal?.addEventListener('abort', quit, { once: true })
    void loop(answers, current)
    return current.outcome.promise.finally(() => signal?.removeEventListener('abort', quit))
  }

  return { status: () => status, connect, stop }
}

export type Supervisor = ReturnType<typeof createSupervisor>
