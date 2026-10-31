import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'

type DiffKind = 'add' | 'del' | 'ctx' | 'gap'

const shownLines = 4

const kindOf = (line: string): DiffKind => {
  if (line.startsWith('@@')) return 'gap'
  if (line.startsWith('+')) return 'add'
  if (line.startsWith('-')) return 'del'
  return 'ctx'
}

const lineOf = (line: string) => {
  const kind = kindOf(line)
  return { kind, text: kind === 'gap' ? line : line.slice(1) }
}

export const hunkExcerpt = (kit: Kit, hunk: string) => {
  const lines = hunk
    .split('\n')
    .filter(line => line && !line.startsWith('\\'))
    .map(lineOf)
    .filter(line => line.kind !== 'gap')
    .slice(-shownLines)
  return lines.length ? div({ class: 'overflow-auto font-mono text-xs' }, ...lines.map(line => kit.diffRow(line))) : null
}
