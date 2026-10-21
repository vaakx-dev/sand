import type { Scope } from '../scope'

export interface Delimiters {
  open: string
  close: string
  keep: boolean
}

export interface Closing {
  end: number
  depth: number
}

const environment =
  /^\\begin\{((?:equation|align|alignat|flalign|gather|multline|eqnarray|[pbBvV]?matrix|smallmatrix|d?r?cases|aligned|alignedat|gathered|split|d?array|subarray)\*?|CD)\}/

const delimitersOf = (text: string): Delimiters | undefined => {
  if (text.startsWith('$$')) return { open: '$$', close: '$$', keep: false }
  if (text.startsWith('\\[')) return { open: '\\[', close: '\\]', keep: false }
  const begin = environment.exec(text)
  return begin ? { open: begin[0], close: `\\end{${begin[1]}}`, keep: true } : undefined
}

export const closingIn = (text: string, { open, close, keep }: Delimiters, depth: number): Closing => {
  let from = 0
  for (;;) {
    const end = text.indexOf(close, from)
    const nested = keep ? text.indexOf(open, from) : -1
    if (nested >= 0 && (end < 0 || nested < end)) {
      depth++
      from = nested + open.length
    } else if (end < 0 || depth === 1) return { end, depth }
    else {
      depth--
      from = end + close.length
    }
  }
}

export const mathOpener = (line: string, { math }: Scope) => {
  if (!math || !/^ {0,3}\S/.test(line)) return undefined
  const text = line.trimStart()
  const delimiters = delimitersOf(text)
  if (!delimiters) return undefined
  const { end } = closingIn(text.slice(delimiters.open.length), delimiters, 1)
  return end < 0 || !text.slice(delimiters.open.length + end + delimiters.close.length).trim() ? delimiters : undefined
}
