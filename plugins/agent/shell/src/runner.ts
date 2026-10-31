import type { ShellRunner } from './contract'
import type { Shell } from './detect'
import { run } from './run'

export const shellRunnerOf = (shell: Shell): ShellRunner => ({
  name: shell.name,
  run: (command, { cwd, signal, timeoutMs, onText }) => run(shell.argv(command), { cwd, verbatim: shell.verbatim, signal, timeout: timeoutMs, onText }),
})
