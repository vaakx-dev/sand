import { byOrder } from '@sand/util'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'

interface Extension {
  id: string
  order?: number
}

export interface ExtensionBook<T extends Extension> {
  entries: Sig<T[]>
  add(entry: T): Dispose
}

export const extensionBook = <T extends Extension>(): ExtensionBook<T> => {
  const entries = sig<T[]>([])

  const add = (entry: T): Dispose => {
    entries.update(list => [...list.filter(each => each.id !== entry.id), entry].sort(byOrder))
    return () => entries.update(list => list.filter(each => each !== entry))
  }

  return { entries, add }
}
