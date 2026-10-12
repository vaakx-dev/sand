import type { MenuSpec } from '@sand/dom'
import type { FileChange } from '../../changes/collect'
import type { ChangesState } from '../view'

export const fileMenu = (file: FileChange, state: ChangesState): MenuSpec => {
  const closed = state.isClosed(file)
  return {
    title: file.path,
    subtitle: `+${file.add} −${file.del}`,
    actions: [
      { id: 'toggle', label: closed ? 'Expand diff' : 'Collapse diff', icon: closed ? 'down' : 'up', group: 'view', tile: true, run: () => state.toggle(file) },
      { id: 'viewed', label: state.viewed.has(file) ? 'Mark as not viewed' : 'Mark as viewed', icon: 'check', group: 'view', tile: true, run: () => state.markViewed(file) },
      { id: 'copy-path', label: 'Copy path', icon: 'copy', group: 'copy', tile: true, run: () => state.copy(file.path, 'path') },
    ],
  }
}
