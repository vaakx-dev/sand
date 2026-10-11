import { effect, sig, untrack } from '@sand/dom'
import type { InstallProgress, InstallTicket } from '@sand/host-dist/contract'
import type { Context } from 'drydock'
import { renewBeforeExpiry } from '../renew'

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

  const started = () => untrack(() => progress.get().length > 0)

  const drop = (id: string) => void ctx.wire.call({ type: 'install.cancel', install: id }).catch(() => {})

  const cancelUnused = () => {
    const old = untrack(() => ticket.get())
    if (old && !started()) drop(old.id)
  }

  effect(() => {
    renew.get()
    if (started()) return
    let current = true
    untrack(() => {
      cancelUnused()
      ticket.set(undefined)
      ctx.wire.call<InstallTicket>({ type: 'install.create' }).then(
        next => {
          if (!current) return drop(next.id)
          error.set(undefined)
          ticket.set(next)
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
    if (active && progress.get().length === 0) renewBeforeExpiry(active.expires, renew)
  })

  effect(() => {
    const off = ctx.on('wire.event', event => {
      if (event.name !== 'install.progress' || event.args[0].install !== ticket.get()?.id) return
      progress.update(list => merged(list, event.args[0]))
    })
    return () => void off()
  })

  effect(() => cancelUnused)

  return { ticket, progress, error }
}
