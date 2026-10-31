import { effect, onTimeout, sig } from '@vaakx-dev/vrui'

const armedFor = 4000

export const confirmStep = () => {
  const armed = sig(false)

  effect(() => {
    if (armed.get()) onTimeout(() => armed.set(false), armedFor)
  })

  const press = (run: () => void) => {
    if (!armed.get()) return armed.set(true)
    armed.set(false)
    run()
  }

  const ring = () => (armed.get() ? 'ring-2 ring-warning-500' : '')

  return { armed, press, ring, reset: () => armed.set(false) }
}

export type ConfirmStep = ReturnType<typeof confirmStep>
