import { collectScope, derive, disposeAll, registerInScope, type Child, type Disposer } from '@vaakx-dev/vrui'
import type { RowDecoration, SidebarThread } from '../contract'
import { attempt } from './attempt'

export interface Decorating {
  thread: SidebarThread
  decorations: RowDecoration[]
}

const shown = (child: Child | undefined): child is Child => child != null && child !== false && child !== ''

export const badges = (read: () => Decorating) => {
  let built: Disposer[] = []
  registerInScope(() => disposeAll(built))
  return derive(() => {
    const { thread, decorations } = read()
    const next = collectScope(() => decorations.map(decoration => attempt(decoration, () => decoration.badge?.(thread))).filter(shown))
    disposeAll(built)
    built = next.scope
    return next.value.length ? next.value : null
  })
}
