import type { Kit } from '@sand/ui-kit/contract'
import { codeBlock } from '../code/block'
import type { Scope } from '../scope'
import { mathOpener } from './delimiters'
import { math } from './renderer'

export const displayMath = (kit: Kit, tex: string) => math()?.display(tex) ?? codeBlock(kit, tex, 'math')

export const mathBlock = (lines: string[], start: number, { kit }: Scope) => {
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
    return { node: displayMath(kit, keep ? open + tex + close : tex), next: index + 1 }
  }
  if (first.trim()) return undefined
  return { node: codeBlock(kit, lines.slice(start).join('\n').trim(), 'math'), next: lines.length }
}
