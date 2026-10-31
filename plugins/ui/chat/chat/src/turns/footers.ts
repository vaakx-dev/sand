import { sig, untrack } from '@vaakx-dev/vrui'
import type { TurnFooter } from '../parts/contract'

const byOrder = (a: TurnFooter, b: TurnFooter) => (a.order ?? 0) - (b.order ?? 0)

export const turnFooters = (changed: () => void) => {
  const list = sig<TurnFooter[]>([])
  const add = (footer: TurnFooter) => {
    list.update(footers => [...footers.filter(other => other.id !== footer.id), footer].sort(byOrder))
    changed()
    return () => {
      list.update(footers => footers.filter(other => other !== footer))
      changed()
    }
  }
  return { list, add, any: () => untrack(() => list.get().length > 0) }
}

export type TurnFooters = ReturnType<typeof turnFooters>
