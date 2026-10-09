import { derive, errorMessage, pulse, sig } from '@sand/dom'
import type { Remote } from '@sand/host-remotes/contract'
import type { Context } from 'drydock'
import type { LoginControl } from '../state'

export type WelcomeStep = 'start' | 'join' | 'joined'

export const welcomeModel = (ctx: Context<'wire'>, control: LoginControl) => {
  const step = sig<WelcomeStep>('start')
  const joined = sig<Remote | undefined>(undefined)
  const skipped = sig(false)
  const busy = sig(false)
  const error = sig('')
  const changes = pulse(ctx, ['models.change', 'thread.select', 'threads.change'], ['models', 'threads'])
  const quiet = changes.read(() => !ctx.models?.list().length && !ctx.threads?.current()?.entries.size)
  const fresh = derive(() => {
    const state = control.state.get()
    return !!state && !state.accounts.some(account => account.signedIn) && !state.remote.length && !state.pcs.length
  })
  const active = derive(() => !skipped.get() && (step.get() !== 'start' || (fresh.get() && quiet.get())))

  const join = async (link: string) => {
    if (busy.get() || !link.trim()) return
    busy.set(true)
    error.set('')
    try {
      joined.set(await ctx.wire.call<Remote>({ type: 'remotes.add', link: link.trim() }))
      step.set('joined')
      void control.load()
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }

  const finish = () => {
    skipped.set(true)
    step.set('start')
    ctx.composer?.focus()
  }

  const go = (next: WelcomeStep) => {
    error.set('')
    step.set(next)
  }

  return { step, joined, busy, error, active, join, finish, go }
}

export type WelcomeModel = ReturnType<typeof welcomeModel>
