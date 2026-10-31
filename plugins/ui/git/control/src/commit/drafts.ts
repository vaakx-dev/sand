import { sig, type Sig } from '@vaakx-dev/vrui'

export interface CommitDraft {
  message: Sig<string>
  excluded: Sig<ReadonlySet<string>>
}

export const commitDrafts = () => {
  const drafts = new Map<string, CommitDraft>()
  return {
    of(key: string) {
      const found = drafts.get(key)
      if (found) return found
      const draft: CommitDraft = { message: sig(''), excluded: sig<ReadonlySet<string>>(new Set()) }
      drafts.set(key, draft)
      return draft
    },
    clear: (key: string) => void drafts.delete(key),
  }
}

export type CommitDrafts = ReturnType<typeof commitDrafts>

export const toggleFile = (draft: CommitDraft, path: string) => {
  const next = new Set(draft.excluded.get())
  if (!next.delete(path)) next.add(path)
  draft.excluded.set(next)
}
