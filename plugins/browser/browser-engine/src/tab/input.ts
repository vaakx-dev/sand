import type { Cdp } from '../chrome'
import type { UserInput } from '../contract'

export const dispatchInput = (cdp: Cdp, input: UserInput) => {
  switch (input.kind) {
    case 'mouse': {
      const { kind, ...event } = input
      return cdp.send('Input.dispatchMouseEvent', event)
    }
    case 'wheel': {
      const { kind, ...event } = input
      return cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...event })
    }
    case 'key':
      return cdp.send('Input.dispatchKeyEvent', {
        type: input.type === 'keyDown' && !input.text ? 'rawKeyDown' : input.type,
        key: input.key,
        code: input.code,
        windowsVirtualKeyCode: input.keyCode,
        modifiers: input.modifiers,
        ...(input.text && { text: input.text, unmodifiedText: input.text }),
      })
    case 'text':
      return cdp.send('Input.insertText', { text: input.text })
  }
}
