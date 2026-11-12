import { models, modelsChange, threads, threadSelect, threadsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { addFlow } from '../add/add-flow'
import type { Step } from '../add/steps'
import type { LoginControl } from '../state'

export type WelcomeStep = 'start' | 'add'

export const welcomeModel = (ctx: Context, control: LoginControl) => {
  const step = sig<WelcomeStep>('start')
  const skipped = sig(false)
  const changes = pulse(ctx, [modelsChange, threadSelect, threadsChange], [models, threads])
  const quiet = changes.read(() => !ctx.get(models)?.list().length && !ctx.get(threads)?.current()?.entries.size)
  const signedOut = derive(() => {
    const state = control.state.get()
    return !!state && !state.accounts.some(account => account.signedIn) && !state.remote.length
  })
  const active = derive(() => !skipped.get() && signedOut.get() && quiet.get())

  const add = addFlow(control, () => back())

  const pick = (next: Step) => {
    step.set('add')
    add.go(next)
  }

  const back = () => {
    add.back()
    step.set('start')
  }

  const skip = () => {
    back()
    skipped.set(true)
  }

  return { step, active, add, pick, back, skip }
}

export type WelcomeModel = ReturnType<typeof welcomeModel>
