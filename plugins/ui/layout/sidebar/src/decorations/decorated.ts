import { collectScope, derive, disposeAll, registerInScope, type Child, type Disposer } from '@vaakx-dev/vrui'
import type { RowDecoration, SidebarThread } from '../contract'
import { attempt } from './attempt'

export interface Decorating {
  thread: SidebarThread
  decorations: RowDecoration[]
}

export type RowPart = 'meta' | 'mark'

const shown = (child: Child | undefined): child is Child => child != null && child !== false && child !== ''

const collect = ({ thread, decorations }: Decorating, part: RowPart, limit: number): Child[] => {
  const found: Child[] = []
  for (const decoration of decorations) {
    if (found.length >= limit) break
    const child = attempt(decoration, () => decoration[part]?.(thread))
    if (shown(child)) found.push(child)
  }
  return found
}

export const decorated = (read: () => Decorating, part: RowPart, limit: number) => {
  let built: Disposer[] = []
  registerInScope(() => disposeAll(built))
  return derive(() => {
    const decorating = read()
    const next = collectScope(() => collect(decorating, part, limit))
    disposeAll(built)
    built = next.scope
    return next.value.length ? next.value : null
  })
}
