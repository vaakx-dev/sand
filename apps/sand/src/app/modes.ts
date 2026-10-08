import type { CliMode } from '@sand/protocol'

const core = [
  'attachments',
  'tools',
  'tools-fs',
  'tools-shell',
  'sessions-sqlite',
  'context-default',
  'model',
  'loop-react',
  'compaction',
  'goal',
  'titles',
  'agents',
  'skills',
  'workflows',
  'extend',
  'reload',
  'remotes',
  'html-render',
  'html-preview',
]

const commands = ['sessions-ui', 'session-info', 'usage', 'panel-tree', 'panel-changes']

const interactive = ['files', 'git', 'folders', 'projects', 'sync', 'followups']

export interface ModeSetup {
  plugins: string[]
}

export const modes: Record<CliMode, ModeSetup> = {
  print: { plugins: [...core, ...commands, 'ui-headless'] },
  serve: { plugins: [...core, ...commands, ...interactive, 'server', 'web'] },
}
