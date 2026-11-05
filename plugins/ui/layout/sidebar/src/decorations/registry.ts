import { byOrder } from '@sand/util'
import { sig, type Child, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { RowDecoration, Sidebar } from '../contract'
import type { ThreadItem } from '../items/item'
import { decorated, type Decorating } from './decorated'
import { rowThread } from './thread'

export interface RowDecor {
  meta: Derive<Child[] | null>
  marks: Derive<Child[] | null>
}

export interface RowDecorations extends Sidebar {
  row(item: Sig<ThreadItem>): RowDecor
}

export const rowDecorations = (): RowDecorations => {
  const decorations = sig<RowDecoration[]>([])

  return {
    decorate(decoration): Dispose {
      decorations.update(current => [...current.filter(found => found.id !== decoration.id), decoration].sort(byOrder))
      return () => decorations.update(current => current.filter(found => found !== decoration))
    },
    row(item) {
      const thread = rowThread(item)
      const read = (): Decorating => ({ thread: thread.get(), decorations: decorations.get() })
      return { meta: decorated(read, 'meta', 1), marks: decorated(read, 'mark', Infinity) }
    },
  }
}
