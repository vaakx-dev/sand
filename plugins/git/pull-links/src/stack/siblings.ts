import { type PullRef, pullKey } from '@sand/github/contract'
import type { StoredLinks } from '../book/record'
import type { PullLink } from '../contract'
import { findLink, isDismissed } from '../links/edit'

export const stackSiblings = (links: PullLink[], stored: StoredLinks): PullRef[] => {
  const found = new Map<string, PullRef>()
  for (const link of links)
    for (const number of link.summary?.stack?.layers ?? []) {
      const ref = { repo: link.repo, number }
      if (!findLink(stored, ref) && !isDismissed(stored, ref)) found.set(pullKey(ref), ref)
    }
  return [...found.values()]
}
