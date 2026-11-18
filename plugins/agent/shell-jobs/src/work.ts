import { type Job, jobNote, jobOutput, type JobWork } from '@sand/jobs/contract'
import type { OutputTail } from '@sand/command-keeper/contract'
import { shellReady, type ShellProcess } from '@sand/shell/contract'
import type { Context } from 'drydock'

type Launch = (job: Job, onText: (text: string) => void) => ShellProcess

const reported = 4_000
const noteEvery = 1_000

const lastLine = (text: string) =>
  Bun.stripANSI(text)
    .split(/[\r\n]/)
    .findLast(line => line.trim())
    ?.trim() ?? ''

export const whenReady =
  (ctx: Context, work: JobWork): JobWork =>
  async (signal, job) => {
    await ctx.waterfall(shellReady, job.cwd, signal, text => ctx.emit(jobNote, { id: job.id, label: job.label, text }))
    signal.throwIfAborted()
    return work(signal, job)
  }

export const commandWork =
  (ctx: Context, output: OutputTail, launch: Launch): JobWork =>
  async (signal, job) => {
    let timer: Timer | undefined
    const note = () => {
      timer = undefined
      const text = lastLine(output.last(500))
      if (text) ctx.emit(jobNote, { id: job.id, label: job.label, text })
    }
    const running = launch(job, text => {
      output.write(text)
      ctx.emit(jobOutput, job.id, text)
      if (!signal.aborted) timer ??= setTimeout(note, noteEvery)
    })
    const kill = () => {
      clearTimeout(timer)
      running.kill().catch(error => ctx.report(error))
    }
    signal.addEventListener('abort', kill, { once: true })
    const code = await running.exited
    signal.removeEventListener('abort', kill)
    clearTimeout(timer)
    const result = `${output.last(reported) || '(no output)'}\n[exit code ${code}]`
    if (code !== 0) throw new Error(result)
    return result
  }
