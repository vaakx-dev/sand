import { type Editor, type EditorId, editorIds } from '../contract'

export interface Where {
  platform: NodeJS.Platform
  which(command: string): string | undefined
  isFolder(path: string): Promise<boolean>
}

interface Way {
  command: string
  args: string[]
}

const inFolder = (command: string): Way => ({ command, args: ['.'] })

const bare = (command: string): Way => ({ command, args: [] })

const editors = { vscode: [inFolder('code')], cursor: [inFolder('cursor')], zed: [inFolder('zed'), inFolder('zeditor')] }

const systems: Partial<Record<NodeJS.Platform, Record<'files' | 'terminal', Way[]>>> = {
  win32: {
    files: [inFolder('explorer')],
    terminal: [{ command: 'wt', args: ['-d', '.'] }, { command: 'cmd', args: ['/c', 'start', 'cmd'] }],
  },
  darwin: {
    files: [inFolder('open')],
    terminal: [{ command: 'open', args: ['-a', 'Terminal', '.'] }],
  },
  linux: {
    files: [inFolder('xdg-open')],
    terminal: ['xdg-terminal-exec', 'x-terminal-emulator', 'gnome-terminal', 'kgx', 'konsole', 'xfce4-terminal', 'xterm'].map(bare),
  },
}

const fileManagers: Partial<Record<NodeJS.Platform, string>> = { win32: 'File Explorer', darwin: 'Finder' }

export const labelOf = (id: EditorId, platform: NodeJS.Platform) =>
  ({ vscode: 'VS Code', cursor: 'Cursor', zed: 'Zed', files: fileManagers[platform] ?? 'File manager', terminal: 'Terminal' })[id]

const waysOf = (id: EditorId, platform: NodeJS.Platform): Way[] => (id === 'files' || id === 'terminal' ? (systems[platform]?.[id] ?? []) : editors[id])

export const commandOf = (id: EditorId, where: Where) => {
  for (const way of waysOf(id, where.platform)) {
    const path = where.which(way.command)
    if (path) return [path, ...way.args]
  }
  return undefined
}

export const detect = (where: Where): Editor[] =>
  editorIds.filter(id => commandOf(id, where)).map(id => ({ id, label: labelOf(id, where.platform) }))
