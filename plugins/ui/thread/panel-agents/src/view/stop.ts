import { controlButton, sig, stopThen } from '@sand/dom'

export const stopButton = (stop: () => Promise<boolean>) => {
  const stopping = sig(false)
  const press = () => {
    stopping.set(true)
    void stop().then(stopped => {
      if (!stopped) stopping.set(false)
    })
  }
  return controlButton(
    'bg-neutral-800 text-neutral-300 hover:bg-danger-950 hover:text-danger-400',
    { size: 'sm', disabled: stopping, onClick: stopThen(press) },
    () => (stopping.get() ? 'Stopping…' : 'Stop'),
  )
}
