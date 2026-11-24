import { appBinary } from '@sand/app-plan'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const claude = appBinary({
  command: 'claude',
  app: 'Claude Code',
  install: 'https://code.claude.com/docs/en/setup',
  installed: [join(homedir(), '.local', 'bin', process.platform === 'win32' ? 'claude.exe' : 'claude')],
})
