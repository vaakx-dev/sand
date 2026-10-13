import type { CliMode } from '@sand/protocol'

const core = [
  'project-files',
  'paths',
  'watch',
  'llm-accounts',
  'claude-code',
  'codex',
  'transfers',
  'attachments',
  'tools',
  'tools-fs',
  'tools-shell',
  'sessions-sqlite',
  'context-default',
  'model',
  'loops',
  'steering',
  'loop-react',
  'loop-plan',
  'hooks',
  'compaction',
  'goal',
  'titles',
  'jobs',
  'worker-model',
  'agents',
  'skills',
  'workflows',
  'extend',
  'reload',
  'html-render',
  'html-preview',
  'browser-engine',
  'browser-tools',
  'web-search',
  'github',
  'github-login',
]

const commands = ['sessions-ui', 'session-info', 'usage', 'panel-tree', 'panel-changes']

const interactive = ['files', 'git', 'folders', 'projects', 'sync', 'followups', 'schedules', 'ask', 'stash', 'user-tools', 'worktrees', 'math', 'reply-images', 'pc-link', 'thread-tools', 'project-tools']

const cli = ['cli-launch', 'cli-devices', 'cli-remotes', 'cli-project', 'cli-usage', 'cli-install', 'cli-release']

const host = [
  'host-runtimes',
  'host-hub',
  'host-devices',
  'host-tailscale',
  'host-gateway',
  'host-dist',
  'host-remotes',
  'host-updates',
  'host-health',
  'host-projects',
  'host-project-sync',
  'host-plugin-sync',
  'host-plugin-library',
  'host-plugin-versions',
  'host-watch',
  'telemetry',
]

interface ModeSetup {
  plugins: string[]
  user?: boolean
}

export const modes: Record<CliMode, ModeSetup> = {
  print: { plugins: [...core, ...commands, 'ui-headless'] },
  serve: { plugins: [...core, ...commands, ...interactive, 'server', 'web', 'telemetry'] },
  command: { plugins: cli, user: false },
  host: { plugins: host, user: false },
}
