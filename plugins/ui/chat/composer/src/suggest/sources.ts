import { sig } from '@vaakx-dev/vrui'
import type { ChatRef, Suggester } from '../contract'

export const createSuggesters = () => {
  const sources = sig<Suggester[]>([])
  return {
    of: (chat: ChatRef) => sources.get().map(source => source(chat)).findLast(Boolean),
    add(source: Suggester) {
      sources.update(all => [...all, source])
      return () => sources.update(all => all.filter(other => other !== source))
    },
  }
}

export type Suggesters = ReturnType<typeof createSuggesters>
