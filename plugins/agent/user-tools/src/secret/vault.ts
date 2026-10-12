import type { ShellEnv } from '@sand/tools-shell/contract'
import type { Dispose } from 'drydock'
import { z } from 'zod'
import { secretMinLength } from '../names'

interface Wait {
  session: string
  settle(value: string | null): void
}

const answerInput = z.object({
  session: z.string(),
  call: z.string(),
  value: z.string().min(secretMinLength, `A secret needs at least ${secretMinLength} characters`).max(20_000).nullable(),
})

export const createVault = (shellEnv: ShellEnv) => {
  const kept = new Map<string, Dispose>()
  const waits = new Map<string, Wait>()

  const keep = (session: string, name: string, value: string) => {
    const key = `${session}\n${name}`
    kept.get(key)?.()
    kept.set(key, shellEnv.set(name, value, session))
  }

  const wait = (call: string, session: string, name: string, signal: AbortSignal) =>
    new Promise<boolean>((resolve, reject) => {
      const abort = () => {
        waits.delete(call)
        reject(signal.reason)
      }
      if (signal.aborted) return abort()
      signal.addEventListener('abort', abort, { once: true })
      waits.set(call, {
        session,
        settle(value) {
          waits.delete(call)
          signal.removeEventListener('abort', abort)
          if (value) keep(session, name, value)
          resolve(Boolean(value))
        },
      })
    })

  const answer = (request: unknown) => {
    const { session, call, value } = answerInput.parse(request)
    const found = waits.get(call)
    if (!found || found.session !== session) throw new Error('This secret request was already answered or the turn has ended')
    found.settle(value)
    return true
  }

  const forget = (session: string) => {
    for (const [key, dispose] of kept) {
      if (!key.startsWith(`${session}\n`)) continue
      dispose()
      kept.delete(key)
    }
  }

  const close = () => {
    for (const dispose of kept.values()) dispose()
    kept.clear()
  }

  return { wait, answer, forget, close }
}

export type Vault = ReturnType<typeof createVault>
