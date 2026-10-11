import { derive, errorMessage, pulse, sig } from '@sand/dom'
import type { Remote } from '@sand/host-remotes/contract'
import type { Context } from 'drydock'
import type { ModelSetup } from '../../contract'
import { addFlow } from '../add/add-flow'
import type { Step } from '../add/steps'
import { whileBusy } from '../parts'
import type { LoginControl } from '../state'

export type WelcomeStep = 'start' | 'add' | 'join' | 'joined' | 'connected'

export const welcomeModel = (ctx: Context<'wire'>, control: LoginControl) => {
  const step = sig<WelcomeStep>('start')
  const joined = sig<Remote | undefined>(undefined)
  const setup = sig<ModelSetup | undefined>(undefined)
  const skipped = sig(false)
  const engaged = sig(false)
  const busy = sig(false)
  const error = sig('')
  const changes = pulse(ctx, ['models.change', 'thread.select', 'threads.change'], ['models', 'threads'])
  const quiet = changes.read(() => !ctx.models?.list().length && !ctx.threads?.current()?.entries.size)
  const fresh = derive(() => {
    const state = control.state.get()
    return !!state && !state.accounts.some(account => account.signedIn) && !state.remote.length && !state.pcs.length
  })
  const active = derive(() => !skipped.get() && (engaged.get() || (fresh.get() && quiet.get())))
  ctx.watch('modelSetup', value => setup.set(value))

  const go = (next: WelcomeStep) => {
    error.set('')
    engaged.set(true)
    step.set(next)
  }

  const connected = derive(() => {
    const state = control.state.get()
    return !!state && (state.accounts.some(account => account.signedIn) || state.remote.length > 0)
  })

  const add = addFlow(control, () => {
    add.back()
    go(connected.get() ? 'connected' : 'start')
  })

  const pick = (next: Step) => {
    go('add')
    add.go(next)
  }

  const back = () => {
    add.back()
    go('start')
  }

  const connect = async (link: string) => {
    try {
      joined.set(await ctx.wire.call<Remote>({ type: 'remotes.add', link }))
      step.set('joined')
      void control.load()
    } catch (failure) {
      error.set(errorMessage(failure))
    }
  }

  const join = async (link: string) => {
    if (busy.get() || !link.trim()) return
    error.set('')
    await whileBusy(busy, () => connect(link.trim()))
  }

  const close = () => {
    add.cancel()
    skipped.set(true)
    step.set('start')
  }

  const finish = () => {
    close()
    ctx.composer?.focus()
  }

  const next = () => {
    const found = setup.get()
    if (!found) return finish()
    close()
    found.start()
  }

  return { step, joined, setup, busy, error, active, connected, add, go, pick, back, join, finish, next }
}

export type WelcomeModel = ReturnType<typeof welcomeModel>
