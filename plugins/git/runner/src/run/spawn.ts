import { errorMessage } from '@sand/util'
import type { GitOptions } from '../contract'
import { GitError } from './error'

const quiet = {
  GIT_TERMINAL_PROMPT: '0',
  GCM_INTERACTIVE: 'never',
  GIT_EDITOR: 'true',
  GIT_MERGE_AUTOEDIT: 'no',
  LC_ALL: 'C',
}

const reading = { GIT_OPTIONAL_LOCKS: '0' }

const flags = ['-c', 'core.quotepath=off', '-c', 'core.longpaths=true']

export const startGit = (cwd: string, args: string[], { env, input, timeoutMs, read }: GitOptions = {}) => {
  try {
    return Bun.spawn(['git', ...flags, ...args], {
      cwd,
      env: { ...process.env, ...quiet, ...(read ? reading : {}), ...env },
      timeout: timeoutMs,
      stdin: input === undefined ? 'ignore' : new Blob([input]),
      stdout: 'pipe',
      stderr: 'pipe',
      windowsHide: true,
    })
  } catch (error) {
    throw new GitError('unknown', `git could not start: ${errorMessage(error)}`)
  }
}
