import type { PullRef } from '@sand/github/contract'
import type { ReviewFile, ReviewFiles } from '@sand/pull-review/contract'
import type { ReviewContext } from '../inject'

interface Source {
  head: string
  commit?: string
}

export const reviewPatches = (ctx: ReviewContext, ref: PullRef) => {
  let source: Source | undefined
  const store = ctx.diff.patches((file: ReviewFile) => {
    const commit = source?.commit
    return ctx.review.patch({ ...ref, path: file.path, ...(commit ? { commit } : {}) })
  })

  const follow = (files: ReviewFiles) => {
    const before = source
    source = { head: files.head, ...(files.commit ? { commit: files.commit } : {}) }
    store.files(files.files)
    if (!before) return
    if (before.commit !== source.commit) store.reset()
    else if (before.head !== source.head) store.stale()
  }

  return { store, follow }
}
