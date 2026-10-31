import { sig } from '@vaakx-dev/vrui'
import type { WorkspaceChoice } from './choice'

export const draftChoices = () => {
  const chosen = sig(new Map<string, WorkspaceChoice>())

  const get = (draft: string) => chosen.get().get(draft)

  const set = (draft: string, choice: WorkspaceChoice) => chosen.update(all => new Map(all).set(draft, choice))

  const forget = (draft: string) =>
    chosen.update(all => {
      const next = new Map(all)
      next.delete(draft)
      return next
    })

  return { get, set, forget }
}

export type DraftChoices = ReturnType<typeof draftChoices>
