import type { UserInput } from '@sand/browser-engine/contract'

type Held = Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>

export const modifiers = (event: Held) => (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0)

const typed = (event: KeyboardEvent) => {
  if (event.key === 'Enter') return '\r'
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey ? event.key : undefined
}

export const isPaste = (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v'

export const keyInput = (type: 'keyDown' | 'keyUp', event: KeyboardEvent): UserInput => ({
  kind: 'key',
  type,
  key: event.key,
  code: event.code,
  keyCode: event.keyCode,
  modifiers: modifiers(event),
  ...(type === 'keyDown' && { text: typed(event) }),
})
