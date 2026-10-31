import { derive, sig, type Child, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import type { RowDecoration, Sidebar } from '../contract'
import type { ThreadItem } from '../items/item'
import { attempt } from './attempt'
import { badges, type Decorating } from './badges'
import { rowThread } from './thread'

export interface RowDecor {
  subtitle: Derive<string>
  badge: Derive<Child[] | null>
}

export interface RowDecorations extends Sidebar {
  row(item: Sig<ThreadItem>): RowDecor
}

const byOrder = (a: RowDecoration, b: RowDecoration) => (a.order ?? 0) - (b.order ?? 0)

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
      const subtitle = derive(() => {
        const { thread, decorations } = read()
        return decorations
          .map(decoration => attempt(decoration, () => decoration.subtitle?.(thread)))
          .filter(Boolean)
          .join(' · ')
      })
      return { subtitle, badge: badges(read) }
    },
  }
}
