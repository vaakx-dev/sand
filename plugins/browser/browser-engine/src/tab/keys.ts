import type { Cdp } from '../chrome'

interface Key {
  key: string
  code: string
  keyCode: number
  text?: string
}

const named: Record<string, Key> = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  Delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  Home: { key: 'Home', code: 'Home', keyCode: 36 },
  End: { key: 'End', code: 'End', keyCode: 35 },
  PageUp: { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  PageDown: { key: 'PageDown', code: 'PageDown', keyCode: 34 },
}

const modifierBits: Record<string, number> = { Alt: 1, Control: 2, Ctrl: 2, Meta: 4, Cmd: 4, Shift: 8 }

const modifierKeys: Record<number, Key> = {
  1: { key: 'Alt', code: 'AltLeft', keyCode: 18 },
  2: { key: 'Control', code: 'ControlLeft', keyCode: 17 },
  4: { key: 'Meta', code: 'MetaLeft', keyCode: 91 },
  8: { key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
}

const character = (key: string): Key => {
  const upper = key.toUpperCase()
  if (/^[A-Z]$/.test(upper)) return { key, code: `Key${upper}`, keyCode: upper.charCodeAt(0), text: key }
  if (/^\d$/.test(key)) return { key, code: `Digit${key}`, keyCode: key.charCodeAt(0), text: key }
  return { key, code: '', keyCode: 0, text: key }
}

const parse = (combo: string) => {
  const parts = combo.split('+').filter(Boolean)
  const last = parts.pop()
  if (!last) throw new Error(`No key in "${combo}"`)
  const unknown = parts.find(part => !(part in modifierBits))
  if (unknown) throw new Error(`Unknown modifier "${unknown}". Use Alt, Control, Meta or Shift.`)
  const key = named[last] ?? (last.length === 1 ? character(last) : undefined)
  if (!key) throw new Error(`Unknown key "${last}". Use a single character or one of ${Object.keys(named).join(', ')}.`)
  return { key, modifiers: parts.reduce((bits, part) => bits | modifierBits[part]!, 0) }
}

const dispatch = (cdp: Cdp, type: 'keyDown' | 'keyUp', key: Key, modifiers: number) => {
  const text = type === 'keyDown' && !(modifiers & ~8) ? key.text : undefined
  return cdp.send('Input.dispatchKeyEvent', {
    type: type === 'keyDown' && !text ? 'rawKeyDown' : type,
    key: key.key,
    code: key.code,
    windowsVirtualKeyCode: key.keyCode,
    modifiers,
    ...(text && { text, unmodifiedText: text }),
  })
}

export const press = async (cdp: Cdp, combo: string) => {
  const { key, modifiers } = parse(combo)
  const held = [1, 2, 4, 8].filter(bit => modifiers & bit).map(bit => modifierKeys[bit]!)
  for (const modifier of held) await dispatch(cdp, 'keyDown', modifier, modifiers)
  await dispatch(cdp, 'keyDown', key, modifiers)
  await dispatch(cdp, 'keyUp', key, modifiers)
  for (const modifier of held.reverse()) await dispatch(cdp, 'keyUp', modifier, modifiers)
}
