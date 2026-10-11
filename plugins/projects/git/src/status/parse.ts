import type { GitStatus } from '../contract'
import { samePath } from '@sand/kit/fs'

const header = (lines: string[], key: string) => {
  const prefix = `# branch.${key} `
  return lines.find(line => line.startsWith(prefix))?.slice(prefix.length)
}

const counts = (value: string | undefined) => {
  const match = value?.match(/^\+(\d+) -(\d+)$/)
  return { ahead: Number(match?.[1] ?? 0), behind: Number(match?.[2] ?? 0) }
}

export const parsePorcelain = (output: string): Omit<GitStatus, 'worktree' | 'base' | 'behindBase'> => {
  const lines = output.split('\n').filter(Boolean)
  const head = header(lines, 'head')
  return {
    branch: !head || head === '(detached)' ? 'HEAD' : head,
    upstream: header(lines, 'upstream'),
    ...counts(header(lines, 'ab')),
    changed: lines.filter(line => !line.startsWith('#') && !line.startsWith('!')).length,
  }
}

export const isLinkedWorktree = (output: string | undefined) => {
  const [dir, common] = (output ?? '').split('\n').map(line => line.trim())
  return Boolean(dir && common && !samePath(dir, common))
}
