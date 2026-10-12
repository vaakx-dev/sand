import { tildeHome, type MenuSpec, type NavAction } from '@sand/dom'
import type { PcUsage, Thread } from '../../data/types'
import type { RowSource } from './rows'

const specOf = (title: string, subtitle: string | undefined, actions: NavAction[]) => (actions.length ? (): MenuSpec => ({ title, subtitle, actions }) : undefined)

export const threadMenu = (thread: Thread, { openThread, copy }: RowSource) => {
  const { cwd } = thread
  const actions: NavAction[] = []
  if (openThread) actions.push({ id: 'open', label: 'Open thread', icon: 'message', group: 'open', run: () => openThread(thread.id) })
  if (cwd) actions.push({ id: 'copy-path', label: 'Copy path', icon: 'folder', group: 'copy', run: () => copy(cwd, 'folder path') })
  return specOf(thread.title ?? 'Untitled', cwd && tildeHome(cwd), actions)
}

export const pcMenu = (pc: PcUsage, source: RowSource) =>
  specOf(pc.name, undefined, source.usage.pcs.length > 1 ? [{ id: 'only', label: 'Show only this PC', icon: 'monitor', run: () => source.showOnly(pc.id) }] : [])
