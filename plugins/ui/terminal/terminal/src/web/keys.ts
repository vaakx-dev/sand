export type Modifier = 'ctrl' | 'alt'

const controls: Record<string, string> = { '@': '\x00', ' ': '\x00', '[': '\x1b', '\\': '\x1c', ']': '\x1d', '^': '\x1e', _: '\x1f', '?': '\x7f' }

const control = (data: string) => {
  if (data.length !== 1) return data
  const lower = data.toLowerCase()
  if (lower >= 'a' && lower <= 'z') return String.fromCharCode(lower.charCodeAt(0) - 96)
  return controls[data] ?? data
}

const arrow = /^\x1b[[O]([ABCD])$/

export const modified = (data: string, modifier: Modifier) => {
  const key = arrow.exec(data)?.[1]
  if (key) return `\x1b[1;${modifier === 'ctrl' ? 5 : 3}${key}`
  return modifier === 'ctrl' ? control(data) : `\x1b${data}`
}

export const arrowKey = (key: 'A' | 'B' | 'C' | 'D', application: boolean) => `\x1b${application ? 'O' : '['}${key}`
