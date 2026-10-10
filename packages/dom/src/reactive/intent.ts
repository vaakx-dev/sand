import { onTimeout, registerInScope } from '@vaakx-dev/vrui'

const hoverDelay = 120

const hovering = (event: PointerEvent) => event.pointerType === 'mouse' || event.pointerType === 'pen'

const keyboard = (event: FocusEvent) => event.currentTarget instanceof Element && event.currentTarget.matches(':focus-visible')

export const intent = (run: () => void) => {
  let pending: (() => void) | undefined
  const cancel = () => {
    pending?.()
    pending = undefined
  }
  registerInScope(cancel)
  return {
    onPointerEnter: (event: PointerEvent) => {
      if (!hovering(event)) return
      cancel()
      pending = onTimeout(run, hoverDelay)
    },
    onPointerLeave: cancel,
    onFocus: (event: FocusEvent) => {
      if (!keyboard(event)) return
      cancel()
      run()
    },
  }
}
