import { gitOk } from '../run/run'

export interface LineCount {
  add: number
  del: number
  binary: boolean
}

export type LineCounts = Map<string, LineCount>

const numstat = ['diff', '--numstat', '-z', '-M', '--no-ext-diff']

const parseNumstat = (out: string, counts: LineCounts) => {
  const records = out.split('\0')
  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    if (!record) continue
    const first = record.indexOf('\t')
    const second = record.indexOf('\t', first + 1)
    if (first < 0 || second < 0) continue
    const added = record.slice(0, first)
    const binary = added === '-'
    let path = record.slice(second + 1)
    if (!path) {
      index += 2
      path = records[index] ?? ''
    }
    const known = counts.get(path)
    counts.set(path, {
      add: (known?.add ?? 0) + (binary ? 0 : Number(added)),
      del: (known?.del ?? 0) + (binary ? 0 : Number(record.slice(first + 1, second))),
      binary: binary || !!known?.binary,
    })
  }
  return counts
}

export const readLineCounts = async (root: string, unborn: boolean): Promise<LineCounts> => {
  const counts: LineCounts = new Map()
  if (!unborn) return parseNumstat(await gitOk(root, [...numstat, 'HEAD', '--'], { read: true }), counts)
  const [staged, unstaged] = await Promise.all([
    gitOk(root, [...numstat, '--cached', '--'], { read: true }),
    gitOk(root, [...numstat, '--'], { read: true }),
  ])
  return parseNumstat(unstaged, parseNumstat(staged, counts))
}
