export interface Porcelain {
  branch: string
  upstream?: string
  ahead: number
  behind: number
  changed: number
}

const header = (lines: string[], key: string) => lines.find(line => line.startsWith(`# branch.${key} `))?.slice(key.length + 10)

const counts = (value: string | undefined) => {
  const match = value?.match(/^\+(\d+) -(\d+)$/)
  return { ahead: Number(match?.[1] ?? 0), behind: Number(match?.[2] ?? 0) }
}

export const parsePorcelain = (output: string): Porcelain => {
  const lines = output.split('\n').filter(Boolean)
  const head = header(lines, 'head')
  return {
    branch: !head || head === '(detached)' ? 'HEAD' : head,
    upstream: header(lines, 'upstream'),
    ...counts(header(lines, 'ab')),
    changed: lines.filter(line => !line.startsWith('#') && !line.startsWith('!')).length,
  }
}

const normal = (path: string) => path.trim().replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase()

export const isLinkedWorktree = (output: string | undefined) => {
  const [dir, common] = (output ?? '').split('\n').filter(Boolean)
  return Boolean(dir && common && normal(dir) !== normal(common))
}
