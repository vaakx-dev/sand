import type { MenuSpec } from '@sand/dom'
import type { FileChange } from '../changes/collect'

export const fileMenu = (file: FileChange, closed: boolean, toggle: (key: string) => void, copy: (text: string, what: string) => void): MenuSpec => ({
  title: file.path,
  subtitle: `+${file.add} −${file.del}`,
  actions: [
    { id: 'toggle', label: closed ? 'Expand diff' : 'Collapse diff', icon: closed ? 'down' : 'up', group: 'view', tile: true, run: () => toggle(file.key) },
    { id: 'copy-path', label: 'Copy path', icon: 'copy', group: 'copy', tile: true, run: () => copy(file.path, 'path') },
  ],
})
