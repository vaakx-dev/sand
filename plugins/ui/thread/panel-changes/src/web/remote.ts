import type { Thread } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import type {} from '../contract'

const throttleMs = 1500

export const remoteFiles = (ctx: Context<'threads'>, changed: () => void) => {
  let thread: string | undefined
  let seen: string | undefined
  let files: Set<string> | undefined
  let asked = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const fetch = async (id: string, device: string | undefined) => {
    if (!ctx.wire) return
    const ask = ++asked
    const keys = await ctx.wire.call<string[]>({ type: 'changes.files', session: id }, device).catch(() => undefined)
    if (ask !== asked || thread !== id || !keys) return
    files = new Set(keys)
    changed()
  }

  const schedule = (current: Thread) => {
    timer ??= setTimeout(() => {
      timer = undefined
      if (thread === current.id) void fetch(current.id, current.device)
    }, throttleMs)
  }

  return {
    of: (id: string) => (id === thread ? files : undefined),
    want(current: Thread, key: string) {
      if (key === seen && current.id === thread) return
      seen = key
      if (current.id === thread) return schedule(current)
      thread = current.id
      files = undefined
      void fetch(current.id, current.device)
    },
    stop: () => clearTimeout(timer),
  }
}
