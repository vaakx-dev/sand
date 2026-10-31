import { derive, registerInScope, sig, untrack, type Child, type Derive, type Sig } from '@vaakx-dev/vrui'
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

const bump = (version: Sig<number>) => version.update(value => value + 1)

export const rowDecorations = (): RowDecorations => {
  const decorations = sig<RowDecoration[]>([])
  const everyRow = sig(0)
  const versions = new Map<string, Sig<number>>()

  const track = (id: string) => {
    const version = sig(0)
    versions.set(id, version)
    registerInScope(() => {
      if (versions.get(id) === version) versions.delete(id)
    })
    return version
  }

  return {
    decorate(decoration): Dispose {
      decorations.update(current => [...current.filter(found => found.id !== decoration.id), decoration].sort(byOrder))
      return () => decorations.update(current => current.filter(found => found !== decoration))
    },
    refresh(thread) {
      const version = thread ? versions.get(thread) : everyRow
      if (version) bump(version)
    },
    row(item) {
      const version = track(untrack(() => item.get().id))
      const thread = rowThread(item)
      const read = (): Decorating => {
        everyRow.get()
        version.get()
        return { thread: thread.get(), decorations: decorations.get() }
      }
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
