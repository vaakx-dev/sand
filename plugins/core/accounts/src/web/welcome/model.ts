import { composer } from '@sand/composer/contract'
import type { wire } from '@sand/devices-contract'
import { models, modelsChange, threads, threadSelect, threadsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { modelSetup, type ModelSetup } from '../../contract'
import { addFlow } from '../add/add-flow'
import type { Step } from '../add/steps'
import type { LoginControl } from '../state'
import { type JoinedPc, pcJoining } from './joining'

export type WelcomeStep = 'start' | 'add' | 'join' | 'joined' | 'connected'

export const welcomeModel = (ctx: Context<{ wire: typeof wire }>, control: LoginControl) => {
  const step = sig<WelcomeStep>('start')
  const joined = sig<JoinedPc | undefined>(undefined)
  const setup = sig<ModelSetup | undefined>(undefined)
  const skipped = sig(false)
  const engaged = sig(false)
  const joining = pcJoining(ctx, pc => {
    joined.set(pc)
    step.set('joined')
    void control.load()
  })
  const changes = pulse(ctx, [modelsChange, threadSelect, threadsChange], [models, threads])
  const quiet = changes.read(() => !ctx.get(models)?.list().length && !ctx.get(threads)?.current()?.entries.size)
  const fresh = derive(() => {
    const state = control.state.get()
    return !!state && !state.accounts.some(account => account.signedIn) && !state.remote.length && !state.pcs.length
  })
  const active = derive(() => !skipped.get() && (engaged.get() || (fresh.get() && quiet.get())))
  ctx.watch(modelSetup, value => setup.set(value))

  const go = (next: WelcomeStep) => {
    joining.stop()
    engaged.set(true)
    step.set(next)
    if (next === 'join') joining.discover()
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

  const close = () => {
    add.cancel()
    skipped.set(true)
    step.set('start')
  }

  const finish = () => {
    close()
    ctx.get(composer)?.focus()
  }

  const next = () => {
    const found = setup.get()
    if (!found) return finish()
    close()
    found.start()
  }

  return { step, joined, joining, setup, active, connected, add, go, pick, back, finish, next }
}

export type WelcomeModel = ReturnType<typeof welcomeModel>
