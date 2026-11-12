import type { MenuAction } from '@sand/ui-shell/contract'
import { mount, stopThen } from '@vaakx-dev/vrui'
import { controlButton } from '../buttons/button'
import { placeLook } from '../surface'
import { menuLayer } from './menu'

export interface ConfirmButtonProps {
  action: MenuAction
  disabled?: () => boolean
}

export const confirm = (event: MouseEvent, action: MenuAction) => {
  const from = event.currentTarget
  if (!(from instanceof HTMLElement)) return
  const box = from.getBoundingClientRect()
  const touch = event instanceof PointerEvent && event.pointerType === 'touch'
  const request = { x: box.left, y: box.bottom, touch, from, title: action.label, actions: [action], step: action.id }
  const close = mount(document.body, menuLayer(request, () => close()))
}

export const confirmButton = ({ action, disabled }: ConfirmButtonProps) =>
  controlButton(
    placeLook(false, 'group'),
    { size: 'sm', disabled, 'aria-haspopup': 'dialog', onClick: stopThen((event: MouseEvent) => confirm(event, action)) },
    action.label,
  )
