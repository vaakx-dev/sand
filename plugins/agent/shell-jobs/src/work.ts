import { jobNote, type JobWork } from '@sand/jobs/contract'
import { shellReady, type ShellRunner } from '@sand/shell/contract'
import type { Context } from 'drydock'
import type { OutputTail } from './output'

const reported = 4_000
const noteEvery = 1_000

const lastLine = (text: string) =>
  Bun.stripANSI(text)
    .split(/[\r\n]/)
    .findLast(line => line.trim())
    ?.trim() ?? ''

export const commandWork =
  (ctx: Context, runner: ShellRunner, command: string, cwd: string, output: OutputTail): JobWork =>
  async (signal, job) => {
    await ctx.waterfall(shellReady, cwd, signal, () => {})
    signal.throwIfAborted()
    let timer: Timer | undefined
    const note = () => {
      timer = undefined
      const text = lastLine(output.last(500))
      if (text) ctx.emit(jobNote, { id: job.id, label: job.label, text })
    }
    const running = runner.start(command, {
      cwd,
      onText(text) {
        output.write(text)
        if (!signal.aborted) timer ??= setTimeout(note, noteEvery)
      },
    })
    const kill = () => {
      clearTimeout(timer)
      void running.kill()
    }
    signal.addEventListener('abort', kill, { once: true })
    const code = await running.exited
    signal.removeEventListener('abort', kill)
    clearTimeout(timer)
    const result = `${output.last(reported) || '(no output)'}\n[exit code ${code}]`
    if (code !== 0) throw new Error(result)
    return result
  }
