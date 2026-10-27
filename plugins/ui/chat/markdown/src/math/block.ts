import { div } from '@vaakx-dev/vrui'
import { codeBlock } from '../code/block'
import type { Scope } from '../scope'
import { closingIn, mathOpener } from './delimiters'

const punctuation = /^[.,;:!?]*$/

const unreadable = ({ kit }: Scope, tex: string, error: string) =>
  div({ class: 'mb-3 flex flex-col gap-1 last:mb-0' }, codeBlock(kit, tex, 'math'), kit.errorText(`Couldn't show this formula. ${error}`))

export const displayMath = (scope: Scope, tex: string) => {
  const shown = scope.math?.display(tex)
  if (!shown) return codeBlock(scope.kit, tex, 'math')
  return shown instanceof Node ? shown : unreadable(scope, tex, shown.error)
}

export const mathBlock = (lines: string[], start: number, scope: Scope) => {
  const delimiters = mathOpener(lines[start]!, scope)
  if (!delimiters) return undefined
  const { open, close, keep } = delimiters
  const wrap = (tex: string) => (keep ? open + tex + close : tex)
  const first = lines[start]!.trimStart().slice(open.length)
  const body: string[] = []
  let depth = 1
  for (let index = start; index < lines.length; index++) {
    const line = index === start ? first : lines[index]!
    if (index > start && index < lines.length - 1 && !line.trim()) return undefined
    const closing = closingIn(line, delimiters, depth)
    depth = closing.depth
    if (closing.end < 0) {
      body.push(line)
      continue
    }
    const tex = [...body, line.slice(0, closing.end)].join('\n').trim()
    const after = line.slice(closing.end + close.length).trim()
    if (punctuation.test(after)) return { node: displayMath(scope, wrap(tex + after)), next: index + 1 }
    return { node: displayMath(scope, wrap(tex)), next: index, rest: after }
  }
  if (first.trim() || !scope.streaming) return undefined
  return { node: codeBlock(scope.kit, lines.slice(start).join('\n').trim(), 'math'), next: lines.length }
}
