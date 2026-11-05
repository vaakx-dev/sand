import type { ContextRecord } from '@sand/chats/contract'
import { parsePullRef, type PullRef, type PullState, type PullSummary } from '@sand/github/contract'
import { uuid } from '@sand/util'

export type PullSnapshot = Pick<PullSummary, 'repo' | 'number' | 'title' | 'state'>

export const pullKind = 'pull'

export const pullUrl = ({ repo, number }: PullRef) => `https://github.com/${repo}/pull/${number}`

export const pullRecord = ({ repo, number, title, state }: PullSnapshot): ContextRecord => ({
  v: 1,
  id: uuid(),
  kind: pullKind,
  label: `#${number}`,
  data: { repo, number, title, state },
})

const states: PullState[] = ['open', 'draft', 'merged', 'closed']

const isState = (value: unknown): value is PullState => states.some(state => state === value)

export const pullOf = ({ data: { repo, number, title, state } }: ContextRecord): PullSnapshot | undefined => {
  if (typeof repo !== 'string' || typeof number !== 'number' || typeof title !== 'string' || !isState(state)) return undefined
  const ref = parsePullRef(`${repo}#${number}`)
  return ref?.repo ? { repo: ref.repo, number: ref.number, title, state } : undefined
}
