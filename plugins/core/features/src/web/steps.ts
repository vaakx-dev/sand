import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild, effect, sig, stored, untrack } from '@vaakx-dev/vrui'
import type { FirstRunStage, FirstStep } from '../contract'
import type { FeatureStore } from './store'

const setupSteps = 2

export const firstSteps = (store: FeatureStore) => {
  const registered = sig<FirstStep[]>([])
  const pending = stored('sand.firstSteps', false)
  const at = sig<number | undefined>(undefined)
  const shown = derive(() => {
    const on = store.choice.get()?.features.filter(feature => feature.on) ?? []
    return on.flatMap(feature => registered.get().filter(step => step.feature === feature.id))
  })
  const current = derive(() => {
    const index = at.get()
    return index === undefined ? undefined : shown.get()[index]
  })
  const stage = derive((): FirstRunStage | undefined => {
    const choice = store.choice.get()
    if (!choice) return undefined
    if (!choice.asked) return 'question'
    return pending.get() ? 'setup' : 'done'
  })

  const finish = () => {
    at.set(undefined)
    pending.set(false)
  }
  const start = () => (shown.get().length ? at.set(0) : finish())
  const next = () => {
    const index = at.get()
    if (index !== undefined && index + 1 < shown.get().length) return at.set(index + 1)
    finish()
  }

  effect(() => {
    if (stage.get() === 'setup' && !store.feature('models')?.on) untrack(start)
  })

  return {
    at,
    shown,
    current,
    stage,
    preceding: () => (store.feature('models')?.on ? setupSteps : 0),
    begin: () => pending.set(true),
    step(step: FirstStep) {
      registered.update(list => [...list, step])
      return () => registered.update(list => list.filter(other => other !== step))
    },
    start,
    next,
  }
}

export type FirstSteps = ReturnType<typeof firstSteps>

export const stepsView = ({ progressSteps, quietButton, setupFrame, setupScreen }: Kit, steps: FirstSteps) =>
  dynamicChild(steps.current, step =>
    step
      ? setupFrame(
          setupScreen(
            progressSteps(steps.preceding() + steps.shown.get().length, steps.preceding() + (steps.at.get() ?? 0) + 1),
            step.render(steps.next),
            quietButton({ size: 'sm', onClick: steps.next }, 'Skip'),
          ),
        )
      : null,
  )
