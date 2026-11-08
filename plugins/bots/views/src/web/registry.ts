import { byOrder } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'

export const registry = <T extends { order?: number }>() => {
  const items = sig<T[]>([])
  return {
    items,
    add(item: T): Dispose {
      items.update(all => [...all, item].sort(byOrder))
      return () => items.update(all => all.filter(other => other !== item))
    },
  }
}

export type Registry<T extends { order?: number }> = ReturnType<typeof registry<T>>
