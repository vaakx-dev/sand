import type { MenuAction } from '@sand/ui-shell/contract'
import { mount, stopThen } from '@vaakx-dev/vrui'
import { controlButton } from '../buttons/button'
import { placeLook } from '../surface'
import { belowOf, menuLayer } from './menu'

export interface ConfirmButtonProps {
  action: MenuAction
  disabled?: () => boolean
}

export const confirm = (event: MouseEvent) => {
  const at = belowOf(event)
  return (action: MenuAction) => {
    if (!at) return
    const close = mount(document.body, menuLayer({ ...at, title: action.label, actions: [action], step: action.id }, () => close()))
  }
}

export const confirmButton = ({ action, disabled }: ConfirmButtonProps) =>
  controlButton(
    placeLook(false, 'group'),
    { size: 'sm', disabled, 'aria-haspopup': 'dialog', onClick: stopThen((event: MouseEvent) => confirm(event)(action)) },
    action.label,
  )
