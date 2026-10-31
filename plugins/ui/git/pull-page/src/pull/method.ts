import type { MergeMethod } from '@sand/github/contract'
import { stored, type Sig } from '@vaakx-dev/vrui'

const methods: MergeMethod[] = ['squash', 'merge', 'rebase']

export const methodLabels: Record<MergeMethod, string> = { squash: 'Squash and merge', merge: 'Merge', rebase: 'Rebase and merge' }

export const methodNotes: Record<MergeMethod, string> = {
  squash: 'All commits become one on the base',
  merge: 'Keeps the commits and adds a merge commit',
  rebase: 'Replays the commits onto the base',
}

let remembered: Sig<Record<string, MergeMethod>> | undefined

const memory = () => (remembered ??= stored<Record<string, MergeMethod>>('sand.pulls.method', {}))

export const chosenMethod = (repo: string, allowed: MergeMethod[] = methods): MergeMethod => {
  const usable = allowed.length ? allowed : methods
  const kept = memory().get()[repo.toLowerCase()]
  return kept && usable.includes(kept) ? kept : (usable[0] ?? 'squash')
}

export const rememberMethod = (repo: string, method: MergeMethod) => memory().set({ ...memory().get(), [repo.toLowerCase()]: method })
