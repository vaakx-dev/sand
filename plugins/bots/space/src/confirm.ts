import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, sig, span } from '@vaakx-dev/vrui'

export interface ConfirmParts {
  label: string
  confirm: string
  run(): Promise<unknown>
}

export const confirmButton = (kit: Kit, { label, confirm, run }: ConfirmParts) => {
  const { actionTones, controlButton, secondaryAction } = kit
  const asking = sig(false)
  const busy = sig(false)
  const go = () => {
    busy.set(true)
    run().finally(() => {
      busy.set(false)
      asking.set(false)
    })
  }
  return dynamicChild(asking, ask =>
    ask
      ? span(
          { class: 'flex items-center gap-2' },
          secondaryAction({ size: 'sm', onClick: () => asking.set(false) }, 'Cancel'),
          controlButton(actionTones.danger, { size: 'sm', disabled: busy, onClick: go }, confirm),
        )
      : secondaryAction({ size: 'sm', onClick: () => asking.set(true) }, label),
  )
}
