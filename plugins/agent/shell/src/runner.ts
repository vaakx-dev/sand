import type { Commands } from './commands'
import type { ShellRunner } from './contract'
import type { Shell } from './detect'
import { run } from './run'

export const shellRunnerOf = (shell: Shell, commands: Commands): ShellRunner => ({
  name: shell.name,
  async run(command, { cwd, signal, timeoutMs, onText }) {
    const { stopped, ...outcome } = await run(shell.argv(command), { cwd, verbatim: shell.verbatim, signal, silence: timeoutMs, limit: timeoutMs, onText })
    return { ...outcome, timedOut: stopped !== undefined }
  },
  start: (spec, onText) => commands.start({ ...spec, argv: shell.argv(spec.command), verbatim: shell.verbatim ?? false }, onText),
  attach: commands.attach,
  follow: commands.follow,
  outlives: commands.outlives,
})
