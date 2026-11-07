export interface Key {
  name: string
  key: string
  code: string
  vk: number
  text?: string
  modifier?: number
}

const named: Key[] = [
  { name: 'ctrl', key: 'Control', code: 'ControlLeft', vk: 0x11, modifier: 2 },
  { name: 'shift', key: 'Shift', code: 'ShiftLeft', vk: 0x10, modifier: 8 },
  { name: 'alt', key: 'Alt', code: 'AltLeft', vk: 0x12, modifier: 1 },
  { name: 'meta', key: 'Meta', code: 'MetaLeft', vk: 0x5b, modifier: 4 },
  { name: 'enter', key: 'Enter', code: 'Enter', vk: 0x0d, text: '\r' },
  { name: 'tab', key: 'Tab', code: 'Tab', vk: 0x09 },
  { name: 'escape', key: 'Escape', code: 'Escape', vk: 0x1b },
  { name: 'backspace', key: 'Backspace', code: 'Backspace', vk: 0x08 },
  { name: 'delete', key: 'Delete', code: 'Delete', vk: 0x2e },
  { name: 'insert', key: 'Insert', code: 'Insert', vk: 0x2d },
  { name: 'space', key: ' ', code: 'Space', vk: 0x20, text: ' ' },
  { name: 'home', key: 'Home', code: 'Home', vk: 0x24 },
  { name: 'end', key: 'End', code: 'End', vk: 0x23 },
  { name: 'pageup', key: 'PageUp', code: 'PageUp', vk: 0x21 },
  { name: 'pagedown', key: 'PageDown', code: 'PageDown', vk: 0x22 },
  { name: 'left', key: 'ArrowLeft', code: 'ArrowLeft', vk: 0x25 },
  { name: 'up', key: 'ArrowUp', code: 'ArrowUp', vk: 0x26 },
  { name: 'right', key: 'ArrowRight', code: 'ArrowRight', vk: 0x27 },
  { name: 'down', key: 'ArrowDown', code: 'ArrowDown', vk: 0x28 },
  { name: '-', key: '-', code: 'Minus', vk: 0xbd, text: '-' },
  { name: '=', key: '=', code: 'Equal', vk: 0xbb, text: '=' },
  { name: ',', key: ',', code: 'Comma', vk: 0xbc, text: ',' },
  { name: '.', key: '.', code: 'Period', vk: 0xbe, text: '.' },
  { name: '/', key: '/', code: 'Slash', vk: 0xbf, text: '/' },
  { name: ';', key: ';', code: 'Semicolon', vk: 0xba, text: ';' },
  { name: "'", key: "'", code: 'Quote', vk: 0xde, text: "'" },
  { name: '[', key: '[', code: 'BracketLeft', vk: 0xdb, text: '[' },
  { name: ']', key: ']', code: 'BracketRight', vk: 0xdd, text: ']' },
  { name: '\\', key: '\\', code: 'Backslash', vk: 0xdc, text: '\\' },
  { name: '`', key: '`', code: 'Backquote', vk: 0xc0, text: '`' },
]

const functionKeys = Array.from({ length: 12 }, (_, index): Key => ({ name: `f${index + 1}`, key: `F${index + 1}`, code: `F${index + 1}`, vk: 0x70 + index }))

const letters = [...'abcdefghijklmnopqrstuvwxyz'].map((letter): Key => ({
  name: letter,
  key: letter,
  code: `Key${letter.toUpperCase()}`,
  vk: letter.toUpperCase().charCodeAt(0),
  text: letter,
}))

const digits = [...'0123456789'].map((digit): Key => ({ name: digit, key: digit, code: `Digit${digit}`, vk: digit.charCodeAt(0), text: digit }))

const aliases: Record<string, string> = {
  control: 'ctrl',
  cmd: 'meta',
  command: 'meta',
  win: 'meta',
  windows: 'meta',
  super: 'meta',
  option: 'alt',
  esc: 'escape',
  return: 'enter',
  del: 'delete',
  pgup: 'pageup',
  pgdn: 'pagedown',
  arrowleft: 'left',
  arrowup: 'up',
  arrowright: 'right',
  arrowdown: 'down',
  minus: '-',
}

const keys = new Map([...named, ...functionKeys, ...letters, ...digits].map(key => [key.name, key]))

const shifted: Record<string, string> = {
  '!': '1',
  '@': '2',
  '#': '3',
  $: '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ')': '0',
  _: '-',
  '+': '=',
  '{': '[',
  '}': ']',
  '|': '\\',
  ':': ';',
  '"': "'",
  '<': ',',
  '>': '.',
  '?': '/',
  '~': '`',
}

const shiftedKeys = Object.entries(shifted).flatMap(([text, base]) => {
  const key = keys.get(base)
  return key ? [{ ...key, name: text, key: text, text }] : []
})

const capitals = letters.map((key): Key => {
  const text = key.key.toUpperCase()
  return { ...key, name: text, key: text, text }
})

const typing = new Map([...keys.values(), ...shiftedKeys, ...capitals].flatMap(key => (key.text ? [[key.text.replace('\r', '\n'), key] as const] : [])))

export const typedKey = (char: string): Key | undefined => typing.get(char)

export const parseKeys = (combo: string): Key[] =>
  combo
    .toLowerCase()
    .split(/\s*\+\s*/)
    .map(part => {
      const key = keys.get(aliases[part] ?? part)
      if (!key) throw new Error(`Unknown key "${part}" in "${combo}". Use names like ctrl, shift, alt, meta, enter, tab, escape, f5, a or 1, joined with +.`)
      return key
    })
