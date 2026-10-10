import { controlButton, sig, stopThen } from '@sand/dom'

const stopper = (stop: () => Promise<boolean>) => {
  const stopping = sig(false)
  const press = stopThen(() => {
    stopping.set(true)
    void stop().then(stopped => {
      if (!stopped) stopping.set(false)
    })
  })
  return { stopping, press }
}

export const stopButton = (stop: () => Promise<boolean>) => {
  const { stopping, press } = stopper(stop)
  return controlButton(
    'bg-neutral-800 text-neutral-300 hover:bg-danger-950 hover:text-danger-400',
    { size: 'sm', disabled: stopping, onClick: press },
    () => (stopping.get() ? 'Stopping…' : 'Stop'),
  )
}
