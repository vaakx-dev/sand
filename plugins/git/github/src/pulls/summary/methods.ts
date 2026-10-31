import type { MergeMethod } from '../../contract'

export const mergeSettingsFields = 'mergeCommitAllowed squashMergeAllowed rebaseMergeAllowed'

export interface MergeSettings {
  mergeCommitAllowed: boolean
  squashMergeAllowed: boolean
  rebaseMergeAllowed: boolean
}

export const allowedMethods = (repo: MergeSettings): MergeMethod[] => {
  const allowed: [MergeMethod, boolean][] = [
    ['squash', repo.squashMergeAllowed],
    ['merge', repo.mergeCommitAllowed],
    ['rebase', repo.rebaseMergeAllowed],
  ]
  return allowed.filter(([, on]) => on).map(([method]) => method)
}
