import type { ShellRunner } from './contract'
import type { Shell } from './detect'
import { run } from './run'
import { start } from './start'

export const shellRunnerOf = (shell: Shell): ShellRunner => ({
  name: shell.name,
  async run(command, { cwd, signal, timeoutMs, onText }) {
    const { stopped, ...outcome } = await run(shell.argv(command), { cwd, verbatim: shell.verbatim, signal, silence: timeoutMs, limit: timeoutMs, onText })
    return { ...outcome, timedOut: stopped !== undefined }
  },
  start: (command, { cwd, onText }) => start(shell.argv(command), onText, { cwd, verbatim: shell.verbatim }),
})
