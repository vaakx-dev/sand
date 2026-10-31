import type { ShellRunner } from '@sand/shell/contract'
import type { StepOutcome } from './outcome'
import { outputTail } from './tail'

const commandTimeoutMs = 30 * 60_000

export const runCommand = async (
  shell: ShellRunner | undefined,
  cwd: string,
  command: string,
  signal: AbortSignal,
  onOutput: (tail: string) => void,
): Promise<StepOutcome> => {
  if (!shell) return { state: 'fail', output: "The shell plugin is off, so setup commands can't run. Turn it on and retry, or continue anyway." }
  const tail = outputTail()
  const result = await shell.run(command, {
    cwd,
    signal,
    timeoutMs: commandTimeoutMs,
    onText: text => {
      tail.add(text)
      onOutput(tail.text())
    },
  })
  if (signal.aborted) return { state: 'fail', output: tail.text('Stopped.') }
  if (result.timedOut) return { state: 'fail', output: tail.text(`Stopped after ${commandTimeoutMs / 60_000} minutes.`) }
  if (result.code !== 0) return { state: 'fail', output: tail.text(`Exited with code ${result.code}.`) }
  return { state: 'ok', output: tail.text() }
}
