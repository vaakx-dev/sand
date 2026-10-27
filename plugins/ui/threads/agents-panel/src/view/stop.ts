import type { Kit } from '@sand/ui-kit/contract'
import { sig, stopThen } from '@vaakx-dev/vrui'

export const stopButton = ({ secondaryAction }: Kit, stop: () => Promise<boolean>) => {
  const stopping = sig(false)
  const press = () => {
    stopping.set(true)
    void stop().then(stopped => {
      if (!stopped) stopping.set(false)
    })
  }
  return secondaryAction({ size: 'sm', disabled: stopping, onClick: stopThen(press) }, () => (stopping.get() ? 'Stopping…' : 'Stop'))
}
