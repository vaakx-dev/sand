import { byOrder } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { TurnFooter } from './contract'

export const turnFooters = () => {
  const list = sig<TurnFooter[]>([])
  const add = (footer: TurnFooter) => {
    list.update(footers => [...footers.filter(other => other.id !== footer.id), footer].sort(byOrder))
    return () => list.update(footers => footers.filter(other => other !== footer))
  }
  return { list, add }
}
