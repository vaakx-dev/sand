import { collectScope, derive, disposeAll, registerInScope, type Child, type Disposer } from '@vaakx-dev/vrui'
import type { RowDecoration, SidebarThread } from '../contract'
import { attempt } from './attempt'

export interface Decorating {
  thread: SidebarThread
  decorations: RowDecoration[]
}

const shown = (child: Child | undefined): child is Child => child != null && child !== false && child !== ''

const firstBadge = ({ thread, decorations }: Decorating): Child[] => {
  for (const decoration of decorations) {
    const child = attempt(decoration, () => decoration.badge?.(thread))
    if (shown(child)) return [child]
  }
  return []
}

export const badges = (read: () => Decorating) => {
  let built: Disposer[] = []
  registerInScope(() => disposeAll(built))
  return derive(() => {
    const decorating = read()
    const next = collectScope(() => firstBadge(decorating))
    disposeAll(built)
    built = next.scope
    return next.value.length ? next.value : null
  })
}
