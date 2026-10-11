import { codeBlock } from '../code/block'
import { mathOpener } from './delimiters'
import { math } from './renderer'

export const displayMath = (tex: string) => math()?.display(tex) ?? codeBlock(tex, 'math')

export const mathBlock = (lines: string[], start: number) => {
  const delimiters = mathOpener(lines[start]!)
  if (!delimiters) return undefined
  const { open, close, keep } = delimiters
  const first = lines[start]!.trimStart().slice(open.length)
  const body: string[] = []
  for (let index = start; index < lines.length; index++) {
    const line = index === start ? first : lines[index]!
    const end = line.indexOf(close)
    if (end < 0) {
      body.push(line)
      continue
    }
    if (line.slice(end + close.length).trim()) return undefined
    const tex = [...body, line.slice(0, end)].join('\n').trim()
    return { node: displayMath(keep ? open + tex + close : tex), next: index + 1 }
  }
  if (first.trim()) return undefined
  return { node: codeBlock(lines.slice(start).join('\n').trim(), 'math'), next: lines.length }
}
