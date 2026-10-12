import { matchLines } from './myers'

const labels = { ours: 'this-pc', theirs: 'other-pc' }

interface Region {
  base: string[]
  ours: string[]
  theirs: string[]
}

const idsOf = (dictionary: Map<string, number>, lines: string[]) =>
  Int32Array.from(lines, line => {
    const known = dictionary.get(line)
    if (known !== undefined) return known
    dictionary.set(line, dictionary.size)
    return dictionary.size - 1
  })

const sameLines = (a: string[], b: string[]) => a.length === b.length && a.every((line, index) => line === b[index])

const endLine = (lines: string[]) => lines.map((line, index) => (index === lines.length - 1 && !line.endsWith('\n') ? `${line}\n` : line))

const conflictLines = (ours: string[], theirs: string[]) => {
  let start = 0
  while (start < ours.length && start < theirs.length && ours[start] === theirs[start]) start++
  let end = 0
  while (end < ours.length - start && end < theirs.length - start && ours[ours.length - 1 - end] === theirs[theirs.length - 1 - end]) end++
  return [
    ...ours.slice(0, start),
    `<<<<<<< ${labels.ours}\n`,
    ...endLine(ours.slice(start, ours.length - end)),
    '=======\n',
    ...endLine(theirs.slice(start, theirs.length - end)),
    `>>>>>>> ${labels.theirs}\n`,
    ...ours.slice(ours.length - end),
  ]
}

const resolveRegion = ({ base, ours, theirs }: Region) => {
  if (sameLines(base, ours)) return { lines: theirs, conflict: false }
  if (sameLines(base, theirs) || sameLines(ours, theirs)) return { lines: ours, conflict: false }
  return { lines: conflictLines(ours, theirs), conflict: true }
}

export const diff3 = (base: string[], ours: string[], theirs: string[]) => {
  const dictionary = new Map<string, number>()
  const baseIds = idsOf(dictionary, base)
  const toOurs = matchLines(baseIds, idsOf(dictionary, ours))
  const toTheirs = matchLines(baseIds, idsOf(dictionary, theirs))
  const merged: string[] = []
  let conflicts = 0
  let [inBase, inOurs, inTheirs] = [0, 0, 0]
  for (;;) {
    let stable = inBase
    while (stable < base.length && ((toOurs[stable] ?? -1) < 0 || (toTheirs[stable] ?? -1) < 0)) stable++
    const oursEnd = stable < base.length ? (toOurs[stable] ?? 0) : ours.length
    const theirsEnd = stable < base.length ? (toTheirs[stable] ?? 0) : theirs.length
    const region = resolveRegion({ base: base.slice(inBase, stable), ours: ours.slice(inOurs, oursEnd), theirs: theirs.slice(inTheirs, theirsEnd) })
    for (const line of region.lines) merged.push(line)
    if (region.conflict) conflicts++
    if (stable >= base.length) return { lines: merged, conflicts }
    merged.push(base[stable] ?? '')
    ;[inBase, inOurs, inTheirs] = [stable + 1, oursEnd + 1, theirsEnd + 1]
  }
}
