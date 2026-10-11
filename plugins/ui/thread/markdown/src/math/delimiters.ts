import { math } from './renderer'

interface Delimiters {
  open: string
  close: string
  keep: boolean
}

const environment = /^\\begin\{((?:equation|align|alignat|gather)\*?|CD)\}/

const delimitersOf = (text: string): Delimiters | undefined => {
  if (text.startsWith('$$')) return { open: '$$', close: '$$', keep: false }
  if (text.startsWith('\\[')) return { open: '\\[', close: '\\]', keep: false }
  const begin = environment.exec(text)
  return begin ? { open: begin[0], close: `\\end{${begin[1]}}`, keep: true } : undefined
}

export const mathOpener = (line: string) => (math() && /^ {0,3}\S/.test(line) ? delimitersOf(line.trimStart()) : undefined)
