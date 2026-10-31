import type { DiffLine, DiffNote } from '@sand/git-diff-view/contract'
import type { PendingComment } from '@sand/pull-review/contract'
import { derive, untrack } from '@vaakx-dev/vrui'
import { commentKey, lineKeys } from '../model/line-keys'
import type { CodeTab } from '../model/state'
import { commentCard } from './comment'
import { draftBox } from './draft'

const byLine = (comments: PendingComment[], path: string) => {
  const found = new Map<string, PendingComment[]>()
  for (const comment of comments) {
    if (comment.path !== path) continue
    const key = commentKey(comment)
    found.set(key, [...(found.get(key) ?? []), comment])
  }
  return found
}

const signatureOf = (comments: PendingComment[], path: string) =>
  comments
    .filter(comment => comment.path === path)
    .map(({ id, side, line, byAgent, body }) => [id, side, line, byAgent, body].join('\u0001'))
    .join('\u0002')

export const lineNotes = (tab: CodeTab, path: string) => {
  const signature = derive(() => signatureOf(tab.pending.review.get().comments, path))
  const comments = derive(() => {
    signature.get()
    return untrack(() => byLine(tab.pending.review.get().comments, path))
  })
  const draft = derive(() => {
    const range = tab.selection.settled.get()
    return range?.path === path ? range : undefined
  })
  const draftAt = (line: DiffLine) => {
    const range = draft.get()
    return range?.lines.at(-1) === line ? range : undefined
  }
  return (line: DiffLine): DiffNote | null => {
    const here = lineKeys(line).flatMap(key => comments.get().get(key) ?? [])
    const drafting = draftAt(line)
    if (!here.length && !drafting) return null
    return () => [...here.map(comment => commentCard(tab, comment)), drafting ? draftBox(tab, drafting) : null]
  }
}
