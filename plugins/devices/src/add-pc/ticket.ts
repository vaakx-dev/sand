import { effect, onTimeout, sig, untrack } from '@sand/dom'
import type { InstallProgress, InstallTicket } from '@sand/protocol'
import type { Context } from 'drydock'

const renewMargin = 30_000
const minRenew = 60_000

const renewDelay = (expires: number) => Math.max(expires - Date.now() - renewMargin, minRenew)

const merged = (list: InstallProgress[], next: InstallProgress) => {
  if (next.step === 'connected') return [next]
  if (next.step === 'failed' && list.some(entry => entry.step === 'failed')) return list
  const kept = list.filter(entry => entry.step !== 'failed' || next.step === 'failed')
  const at = kept.findIndex(entry => entry.step === next.step)
  if (at < 0) return [...kept, next]
  return kept.map((entry, index) => (index === at ? next : entry))
}

export const installTicket = (ctx: Context<'wire'>) => {
  const ticket = sig<InstallTicket | undefined>(undefined)
  const progress = sig<InstallProgress[]>([])
  const error = sig<unknown>(undefined)
  const renew = sig(0)
  let closed = false

  const started = () => untrack(() => progress.get().length > 0)

  const cancel = (old: InstallTicket | undefined) => {
    if (old && !started()) ctx.wire.call({ type: 'install.cancel', install: old.id }).catch(() => undefined)
  }

  effect(() => {
    renew.get()
    if (started() || closed) return
    let current = true
    untrack(() => {
      cancel(ticket.get())
      ticket.set(undefined)
      ctx.wire.call<InstallTicket>({ type: 'install.create' }).then(
        next => {
          if (current && !closed) ticket.set(next)
          else ctx.wire.call({ type: 'install.cancel', install: next.id }).catch(() => undefined)
        },
        failure => {
          if (current) error.set(failure)
        },
      )
    })
    return () => {
      current = false
    }
  })

  effect(() => {
    const active = ticket.get()
    if (active && progress.get().length === 0) onTimeout(() => renew.update(count => count + 1), renewDelay(active.expires))
  })

  effect(() => {
    const off = ctx.on('wire.event', event => {
      if (event.name !== 'install.progress') return
      const next = event.args[0]
      if (next.install !== ticket.get()?.id) return
      progress.update(list => merged(list, next))
    })
    return () => void off()
  })

  const close = () => {
    if (closed) return
    closed = true
    cancel(ticket.get())
  }

  effect(() => close)

  return { ticket, progress, error, close }
}
