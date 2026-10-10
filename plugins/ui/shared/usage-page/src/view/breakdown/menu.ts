import { tildeHome, type MenuSpec, type NavAction } from '@sand/dom'
import type { PcUsage, Thread } from '../../data/types'
import type { RowSource } from './rows'

const specOf = (title: string, subtitle: string | undefined, actions: NavAction[]) => (actions.length ? (): MenuSpec => ({ title, subtitle, actions }) : undefined)

export const threadMenu = (thread: Thread, source: RowSource) =>
  specOf(thread.title ?? 'Untitled', thread.cwd && tildeHome(thread.cwd), [
    ...(source.openThread ? [{ id: 'open', label: 'Open thread', icon: 'message', group: 'open', run: () => source.openThread?.(thread.id) }] : []),
    ...(thread.cwd ? [{ id: 'copy-path', label: 'Copy folder path', icon: 'folder', group: 'copy', run: () => source.copy(thread.cwd ?? '', 'folder path') }] : []),
  ])

export const pcMenu = (pc: PcUsage, source: RowSource) =>
  specOf(pc.name, undefined, source.usage.pcs.length > 1 ? [{ id: 'only', label: 'Show only this PC', icon: 'monitor', run: () => source.showOnly(pc.id) }] : [])
