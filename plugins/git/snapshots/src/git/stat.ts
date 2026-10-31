import type { GitRunner } from '@sand/git/contract'

export interface ChangeStat {
  files: number
  add: number
  del: number
}

const numstat = ['diff', '--numstat', '-z', '-M', '--no-color', '--no-ext-diff', '--no-textconv']

export const statBetween = async (git: GitRunner, root: string, from: string, to: string): Promise<ChangeStat> => {
  const records = (await git.ok(root, [...numstat, from, to], { read: true })).split('\0')
  const stat: ChangeStat = { files: 0, add: 0, del: 0 }
  let at = 0
  while (at < records.length) {
    const head = records[at++]
    if (!head) continue
    const [added, deleted, path] = head.split('\t')
    if (!path) at += 2
    stat.files++
    if (added !== '-') {
      stat.add += Number(added)
      stat.del += Number(deleted)
    }
  }
  return stat
}
