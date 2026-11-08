import { type Pcs, pcsChange, type Wire } from '@sand/devices-contract'
import { listen, onTimeout } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type SshAsk, type SshConnectOptions, type SshPrompt, sshAnswer, sshAsk, sshCancel, sshConnect, sshProgress, sshReconnect } from '../contract'

export type Prompt = (prompt: SshPrompt, signal: AbortSignal) => Promise<string | null>

export interface AttemptDeps {
  ctx: Context
  wire: Pick<Wire, 'call' | 'on'>
  pcs: Pick<Pcs, 'online' | 'name'>
  prompt: Prompt
}

const setupTimeout = 15 * 60_000
const onlineTimeout = 60_000

const cancelled = () => new DOMException('Cancelled', 'AbortError')

const untilAborted = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    if (signal.aborted) return reject(cancelled())
    listen(signal, 'abort', () => reject(cancelled()), { once: true })
  })

export const attempts = ({ ctx, wire, pcs, prompt }: AttemptDeps) => {
  const online = (pc: string, signal: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      if (pcs.online(pc)) return resolve()
      const stop = () => {
        void off()
        clearTimer()
        unlisten()
      }
      const off = ctx.on(pcsChange, () => {
        if (!pcs.online(pc)) return
        stop()
        resolve()
      })
      const clearTimer = onTimeout(() => {
        stop()
        reject(new Error(`${pcs.name(pc)} is set up, but this page can’t reach it yet. Check it’s on and try again.`))
      }, onlineTimeout)
      const unlisten = listen(signal, 'abort', stop)
    })

  const run = async (start: (attempt: string) => Promise<string>, { progress, ask, signal }: SshConnectOptions = {}) => {
    if (signal?.aborted) throw cancelled()
    const attempt = crypto.randomUUID()
    const live = new AbortController()

    const answer = async (question: SshAsk) => {
      const value = await (ask ? ask(question) : prompt(question, live.signal)).catch(error => {
        ctx.report(error)
        return null
      })
      if (!live.signal.aborted) await wire.call(sshAnswer, { attempt, id: question.id, value })
    }
    const cancel = () => {
      wire.call(sshCancel, { attempt }).catch(error => ctx.report(error))
      live.abort()
    }
    const offs = [
      wire.on(sshProgress, update => {
        if (update.attempt === attempt) progress?.(update.text)
      }),
      wire.on(sshAsk, question => {
        if (question.attempt === attempt) answer(question).catch(error => ctx.report(error))
      }),
    ]
    const unlisten = signal ? listen(signal, 'abort', cancel, { once: true }) : undefined
    try {
      const pc = await Promise.race([start(attempt), untilAborted(live.signal)])
      await Promise.race([online(pc, live.signal), untilAborted(live.signal)])
      return pc
    } finally {
      unlisten?.()
      for (const off of offs) void off()
      live.abort()
    }
  }

  return {
    connect: (host: string, options?: SshConnectOptions) =>
      run(attempt => wire.call(sshConnect, { host, attempt }, undefined, { timeout: setupTimeout }).then(reply => reply.pc), options),
    reconnect: async (pc: string, options?: SshConnectOptions) => {
      await run(attempt => wire.call(sshReconnect, { pc, attempt }, undefined, { timeout: setupTimeout }).then(() => pc), options)
    },
  }
}
