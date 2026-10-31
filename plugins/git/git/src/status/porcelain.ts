import type { FileKind, GitFile } from '../contract'

export interface StatusHead {
  oid?: string
  branch?: string
  unborn: boolean
}

export interface ParsedStatus {
  head: StatusHead
  files: GitFile[]
}

const after = (record: string, spaces: number) => {
  let at = 0
  for (let count = 0; count < spaces; count++) at = record.indexOf(' ', at) + 1
  return record.slice(at)
}

const entry = (path: string, xy: string, kind: FileKind, from?: string): GitFile => ({
  path,
  ...(from === undefined ? {} : { from }),
  kind,
  staged: xy[0] !== '.',
  unstaged: xy[1] !== '.',
  add: 0,
  del: 0,
})

const changedKind = (xy: string): FileKind => {
  if (xy.includes('D')) return 'deleted'
  if (xy[0] === 'A') return 'added'
  return 'modified'
}

const readHeader = (head: StatusHead, record: string) => {
  const [, key, value = ''] = record.match(/^# (\S+) (.*)$/) ?? []
  if (key === 'branch.oid') {
    if (value === '(initial)') head.unborn = true
    else head.oid = value
  }
  if (key === 'branch.head' && value !== '(detached)') head.branch = value
}

export const parseStatus = (out: string): ParsedStatus => {
  const head: StatusHead = { unborn: false }
  const files: GitFile[] = []
  const records = out.split('\0')
  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    if (!record) continue
    const xy = record.slice(2, 4)
    switch (record[0]) {
      case '#':
        readHeader(head, record)
        break
      case '1':
        files.push(entry(after(record, 8), xy, changedKind(xy)))
        break
      case '2':
        files.push(entry(after(record, 9), xy, xy.includes('R') ? 'renamed' : 'added', records[++index]))
        break
      case 'u':
        files.push(entry(after(record, 10), xy, 'conflicted'))
        break
      case '?':
        files.push({ path: record.slice(2), kind: 'untracked', staged: false, unstaged: true, add: 0, del: 0 })
        break
    }
  }
  return { head, files }
}
