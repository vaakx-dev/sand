const named: Record<string, string> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'return',
  Escape: 'escape',
  Tab: 'tab',
  ' ': 'space',
  Backspace: 'backspace',
  Delete: 'delete',
  Home: 'home',
  End: 'end',
  PageUp: 'pageup',
  PageDown: 'pagedown',
}

const modifiers = ['ctrl', 'alt', 'shift', 'meta']

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const base = (event: KeyboardEvent) => {
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase()
  if (/^Digit\d$/.test(event.code)) return event.code.slice(5)
  if (named[event.key]) return named[event.key]
  if (/^F\d+$/.test(event.key)) return event.key.toLowerCase()
  return event.key.length === 1 ? event.key.toLowerCase() : undefined
}

const modifierName = (part: string) => {
  if (part === 'mod') return isMac() ? 'meta' : 'ctrl'
  return part === 'cmd' ? 'meta' : part
}

export const keyName = (event: KeyboardEvent) => {
  const key = base(event)
  if (!key) return
  const held = [event.ctrlKey, event.altKey, event.shiftKey, event.metaKey]
  return [...modifiers.filter((_, index) => held[index]), key].join('+')
}

export const normalKey = (key: string) => {
  const parts = key.toLowerCase().split('+')
  const last = parts.pop() || '+'
  const held = parts.map(modifierName)
  return [...modifiers.filter(modifier => held.includes(modifier)), last].join('+')
}

export const chorded = (key: string) => /(^|\+)(ctrl|alt|meta)\+/.test(key) || /^f\d+$/.test(key)
