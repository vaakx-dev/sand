import { onTimeout, registerInScope } from '@vaakx-dev/vrui'

const hoverDelay = 120

export const intent = (run: () => void) => {
  let pending: (() => void) | undefined
  const cancel = () => {
    pending?.()
    pending = undefined
  }
  registerInScope(cancel)
  return {
    onPointerEnter: () => {
      cancel()
      pending = onTimeout(run, hoverDelay)
    },
    onPointerLeave: cancel,
    onFocus: () => {
      cancel()
      run()
    },
  }
}
