import { installCancel, installCreate, installProgress, type InstallProgress, type InstallTicket } from '@sand/host-dist/contract'
import { effect, sig, untrack } from '@vaakx-dev/vrui'
import type { WireContext } from '../inject'
import { renewBeforeExpiry } from '../renew'

const merged = (list: InstallProgress[], next: InstallProgress) => {
  if (next.step === 'connected') return [next]
  if (next.step === 'failed' && list.some(entry => entry.step === 'failed')) return list
  const kept = list.filter(entry => entry.step !== 'failed' || next.step === 'failed')
  const at = kept.findIndex(entry => entry.step === next.step)
  if (at < 0) return [...kept, next]
  return kept.map((entry, index) => (index === at ? next : entry))
}

export const installTicket = (ctx: WireContext) => {
  const ticket = sig<InstallTicket | undefined>(undefined)
  const progress = sig<InstallProgress[]>([])
  const error = sig<unknown>(undefined)
  const renew = sig(0)

  const started = () => untrack(() => progress.get().length > 0)

  const drop = (id: string) => void ctx.wire.call(installCancel, { install: id }).catch(() => {})

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
      ctx.wire.call(installCreate, {}).then(
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
    const off = ctx.wire.on(installProgress, next => {
      if (next.install === ticket.get()?.id) progress.update(list => merged(list, next))
    })
    return () => void off()
  })

  effect(() => cancelUnused)

  return { ticket, progress, error }
}
