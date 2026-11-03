import type { ShellRunner } from './contract'
import type { Shell } from './detect'
import { run } from './run'

export const shellRunnerOf = (shell: Shell): ShellRunner => ({
  name: shell.name,
  async run(command, { cwd, signal, timeoutMs, onText }) {
    const { stopped, ...outcome } = await run(shell.argv(command), { cwd, verbatim: shell.verbatim, signal, silence: timeoutMs, limit: timeoutMs, onText })
    return { ...outcome, timedOut: stopped !== undefined }
  },
})
