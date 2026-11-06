import type { wire } from '@sand/devices-contract'
import { firstRun, type FirstRun } from '@sand/features/contract'
import { models, modelsChange, threads, threadSelect, threadsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { modelSetup, type ModelSetup } from '../../contract'
import { addFlow } from '../add/add-flow'
import type { Step } from '../add/steps'
import type { LoginControl } from '../state'
import { type JoinedPc, pcJoining } from './joining'

const setupSteps = 2

export type WelcomeStep = 'start' | 'add' | 'join' | 'joined' | 'connected'

export const welcomeModel = (ctx: Context<{ wire: typeof wire }>, control: LoginControl) => {
  const step = sig<WelcomeStep>('start')
  const joined = sig<JoinedPc | undefined>(undefined)
  const setup = sig<ModelSetup | undefined>(undefined)
  const run = sig<FirstRun | undefined>(undefined)
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
  ctx.watch(modelSetup, value => setup.set(value))
  ctx.watch(firstRun, value => run.set(value))
  const stage = derive(() => {
    const found = run.get()
    return found ? found.stage() : 'done'
  })
  const active = derive(() => !skipped.get() && (engaged.get() || stage.get() === 'setup' || (stage.get() === 'done' && fresh.get() && quiet.get())))
  const total = derive(() => setupSteps + (run.get()?.steps().length ?? 0))

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
    run.get()?.start()
  }

  const next = () => {
    const found = setup.get()
    if (!found) return finish()
    close()
    found.start()
  }

  return { step, total, joined, joining, setup, active, connected, add, go, pick, back, finish, next }
}

export type WelcomeModel = ReturnType<typeof welcomeModel>
