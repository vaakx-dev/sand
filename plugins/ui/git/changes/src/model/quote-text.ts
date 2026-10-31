import type { DiffLine, DiffRange } from '@sand/git-diff-view/contract'

const signs: Partial<Record<DiffLine['kind'], string>> = { add: '+', del: '-', ctx: ' ' }

const where = ({ start, end, side }: DiffRange) => {
  const span = start === end ? String(start) : `${start}-${end}`
  return side === 'old' ? `${span} (removed)` : span
}

const fenceFor = (body: string[]) => {
  const runs = body.flatMap(line => line.match(/`+/g) ?? [])
  const longest = runs.reduce((most, run) => Math.max(most, run.length), 0)
  return '`'.repeat(Math.max(3, longest + 1))
}

export const quoteText = (range: DiffRange) => {
  const body = range.lines.map(line => `${signs[line.kind] ?? ' '}${line.text}`)
  const fence = fenceFor(body)
  return [`${range.path}:${where(range)}`, `${fence}diff`, ...body, fence].join('\n')
}
