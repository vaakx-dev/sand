import { type GitRepoLocal, type GitStatus, repoOf } from '@sand/git/contract'
import { collectScope, derive, disposeAll, sig, untrack, type Derive } from '@vaakx-dev/vrui'

export interface Change {
  add: number
  del: number
  files: number
}

export interface PlaceView {
  branch: Derive<string | undefined>
  worktree: Derive<boolean>
  change: Derive<Change | undefined>
}

const shortSha = 7

const branchOf = (local: GitRepoLocal | undefined) => local && (local.branch ?? local.head?.slice(0, shortSha))

const changeKey = (change: Change | undefined) => change && `${change.add}:${change.del}:${change.files}`

const changeOf = (local: GitRepoLocal | undefined): Change | undefined =>
  local?.fileCount ? { add: local.add, del: local.del, files: local.fileCount } : undefined

const steady = (read: () => Change | undefined) => {
  let last: Change | undefined
  return derive(() => {
    const next = read()
    if (changeKey(next) !== changeKey(last)) last = next
    return last
  })
}

export const placeView = () =>
  untrack(() => {
    const status = sig<GitStatus | undefined>(undefined)
    const { value: view, scope } = collectScope((): PlaceView => {
      const local = derive(() => repoOf(status.get()))
      return {
        branch: derive(() => branchOf(local.get())),
        worktree: derive(() => Boolean(local.get()?.worktree)),
        change: steady(() => changeOf(local.get())),
      }
    })
    return { status, view, dispose: () => disposeAll(scope) }
  })

export type PlaceEntry = ReturnType<typeof placeView>
