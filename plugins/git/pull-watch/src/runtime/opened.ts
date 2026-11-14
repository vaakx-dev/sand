import type { Session, ToolResultBlock } from '@sand/chats/contract'
import { type GitHub, type PullRef, pullRefOf } from '@sand/github/contract'
import type { Turns } from '@sand/turns-contract/contract'
import type { Follows } from './follows'

export interface OpenedDeps {
  turns: Turns
  github: Pick<GitHub, 'rest'>
  follows: Follows
  report(error: unknown): void
}

const SKEW_MS = 60_000

const pullUrls = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/g

const urlsIn = ({ content }: ToolResultBlock) => new Set(content.flatMap(block => (block.type === 'text' ? (block.text.match(pullUrls) ?? []) : [])))

const keyOf = ({ repo, number }: PullRef) => `${repo.toLowerCase()}#${number}`

export const watchOpened = ({ turns, github, follows, report }: OpenedDeps) => {
  const checked = new Map<string, Set<string>>()

  const fresh = (session: Session, ref: PullRef) => {
    const known = checked.get(session.id) ?? new Set<string>()
    checked.set(session.id, known)
    if (known.has(keyOf(ref))) return false
    known.add(keyOf(ref))
    return true
  }

  const openedSince = async (ref: PullRef, since: number) => {
    const pull = await github.rest<{ created_at: string }>('GET', `/repos/${ref.repo}/pulls/${ref.number}`)
    return Date.parse(pull.created_at) >= since - SKEW_MS
  }

  const consider = async (session: Session, ref: PullRef, since: number) => {
    if (!fresh(session, ref)) return
    if (await openedSince(ref, since)) await follows.follow(session.id, ref)
  }

  return {
    result(result: ToolResultBlock, session: Session) {
      const since = turns.current(session)?.started ?? Date.now()
      const refs = [...urlsIn(result)].map(pullRefOf).filter(ref => ref !== undefined)
      for (const ref of refs) void consider(session, ref, since).catch(report)
    },
    forget: (thread: string) => void checked.delete(thread),
  }
}
