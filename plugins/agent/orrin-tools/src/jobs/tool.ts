import type { ToolResultContent } from '@sand/chats/contract'
import type { Job, JobKind } from '@sand/orrin/contract'
import type { ToolContext } from '@sand/tools/contract'
import { z } from 'zod'
import type { MakeTool, Scope } from '../scope'
import { keepArtifacts } from './artifacts'
import { followLogs } from './follow'
import { logTail } from './log'

const input = z.object({
  target: z.string().describe('Target name from [targets] in the project orrin.toml'),
  args: z.array(z.string()).optional().describe('Extra arguments for the target command'),
  timeout_ms: z.number().int().positive().optional().describe('Cancel the job after this many milliseconds (default 600000)'),
})

const about: Record<JobKind, string> = {
  build: 'Build a target',
  run: 'Run a target',
  test: 'Run a test target',
  screenshot: 'Run a screenshot target; the screenshots come back as images you can see',
  export: 'Run an export target',
}

const throwawayNotice =
  'This ran in a throwaway copy of your view that is deleted after the job; files it wrote there (including relative paths in args) did not change your project. Only the artifacts listed are kept. To keep a screenshot, write it to the screenshots folder (env ORRIN_SCREENSHOTS, placeholder {screenshots}).'

const summary = (job: Job, timedOut: boolean) =>
  [
    `Job ${job.id}: ${timedOut ? 'timed out and was cancelled' : job.state}`,
    job.cached && 'from cache',
    job.exit_code !== null && `exit code ${job.exit_code}`,
    job.error && `error: ${job.error}`,
  ]
    .filter(Boolean)
    .join(', ')

interface JobCall {
  target: string
  args: string[]
  timeoutMs: number
}

const runJob = async (kind: JobKind, scope: Scope, { target, args, timeoutMs }: JobCall, { signal, progress }: ToolContext) => {
  const { orrin } = scope
  const started = await orrin.call(kind, { project: scope.project, view: scope.view, target, args }, signal)
  const cancel = () => orrin.call('job.cancel', { job: started.id }).catch(() => undefined)
  try {
    const { lines, timedOut } = await followLogs(orrin, started.id, { signal, timeoutMs, progress })
    if (timedOut) await cancel()
    const job = await orrin.call('job.status', { job: started.id }, signal)
    const { artifacts } = await orrin.call('job.artifacts', { job: started.id }, signal)
    const { list, images } = await keepArtifacts(orrin, scope.attachments, started.id, artifacts, signal)
    const text = [summary(job, timedOut), throwawayNotice, list, lines.length ? `Log:\n${logTail(lines)}` : ''].filter(Boolean).join('\n\n')
    return [{ type: 'text', text } as ToolResultContent, ...images]
  } catch (error) {
    if (signal.aborted) void cancel()
    throw error
  }
}

export const jobTool = (tool: MakeTool, kind: JobKind) =>
  tool({
    name: kind,
    description: `${about[kind]} from the project orrin.toml through Orrin, in a fresh run folder (targets with link_outputs also link their outputs into the project folder). Streams the log while it runs and returns the status, the log tail (with error lines from any cut part) and the artifacts. The run folder is a throwaway copy that is deleted after the job: files the command writes there, including relative paths in args such as \`--screenshot shots/hud.png\`, do not change your project. Only artifacts are kept; files written to the screenshots folder (env ORRIN_SCREENSHOTS, placeholder {screenshots}) become artifacts. Each artifact is saved outside the project and its absolute path is listed in the result, so you can read it back.`,
    input,
    run: ({ target, args = [], timeout_ms = 600_000 }, scope, context) => runJob(kind, scope, { target, args, timeoutMs: timeout_ms }, context),
  })
