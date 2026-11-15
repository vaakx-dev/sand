import type { ToolStatus, ToolView } from '@sand/transcript/contract'
import type { ScriptCall, ScriptRun } from '../contract'

const statusOf = ({ result }: ScriptCall, run: ScriptRun): ToolStatus => {
  if (result) return result.isError ? 'failed' : 'done'
  return run.status === 'running' ? 'running' : 'failed'
}

const callViews = (run: ScriptRun | undefined): ToolView[] =>
  run?.calls.map(call => ({ call: call.call, ...(call.result && { result: call.result }), status: statusOf(call, run), thread: run.thread })) ?? []

export { callViews }
