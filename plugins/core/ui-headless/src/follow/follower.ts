import type { ContextUsage } from '@sand/compaction/contract'
import type { Artifact } from '@sand/html-render/contract'
import type { Limits, LLMEvent } from '@sand/llm-accounts/contract'
import type { TurnResult } from '@sand/loops/contract'
import type { ToolCallBlock, ToolResultBlock, Usage, UserContent } from '@sand/messages'
import type { SessionInfo } from '@sand/sessions-sqlite/contract'
import type { Printer, Summary } from '../print/printer'
import { agentEnded, agentStarted, jobEnded, type JobView } from '../print/progress'
import { ownModel, type ModelLookup } from './models'
import { createCompactionLines } from './compaction'
import { createTracker } from './tracker'

const addUsage = (a: Usage, b: Usage): Usage => ({
  input: a.input + b.input,
  output: a.output + b.output,
  cacheRead: a.cacheRead + b.cacheRead,
  cacheWrite: a.cacheWrite + b.cacheWrite,
})

export const createFollower = (root: () => string | undefined, printer: Printer, models?: ModelLookup) => {
  const tracker = createTracker(root)
  const compaction = createCompactionLines(tracker.has)
  const summary: Summary = { usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }
  const mine = (session: string) => session === root()
  let turned = false
  let ended: TurnResult | undefined

  return {
    llmEvent(event: LLMEvent, session: string) {
      if (mine(session)) printer.event(event)
    },
    toolStart(call: ToolCallBlock, session: string) {
      if (mine(session)) printer.call(call)
    },
    toolResult(result: ToolResultBlock, session: string) {
      if (mine(session)) printer.result(result)
    },
    artifact(session: string, artifact: Artifact) {
      if (mine(session)) printer.artifact(artifact)
    },
    context(session: string, usage: ContextUsage) {
      if (mine(session)) summary.context = usage
      const line = compaction.change(session, usage)
      if (line) printer.progress(line)
    },
    limits(limits: Limits | undefined) {
      if (limits) summary.limits = limits
    },
    turnStart(session: string) {
      if (!mine(session)) return
      if (!turned) printer.begin()
      turned = true
      tracker.turnStarted()
    },
    turnContinue(session: string, content: UserContent[]) {
      if (mine(session)) printer.continued(content)
    },
    turnEnd(session: string, result: TurnResult) {
      if (!mine(session)) return
      ended = result
      summary.usage = addUsage(summary.usage, result.usage)
      if (result.stopReason === 'interrupted') printer.progress('■ interrupted')
      tracker.turnEnded(result.stopReason === 'interrupted')
    },
    agentStart(agent: SessionInfo) {
      if (!tracker.adopt(agent.id, agent.parent)) return
      compaction.name(agent)
      printer.progress(agentStarted(agent, ownModel(agent, models)))
    },
    agentEnd(agent: SessionInfo, result: TurnResult) {
      if (tracker.has(agent.id)) printer.progress(agentEnded(agent, result))
    },
    jobStart(job: JobView) {
      tracker.jobStarted(job)
    },
    jobEnd(job: JobView) {
      if (tracker.jobEnded(job)) printer.progress(jobEnded(job))
    },
    turned: () => turned,
    ended: () => ended,
    async finish(signal: AbortSignal) {
      printer.waiting(tracker.running())
      await tracker.settled(signal)
      printer.done(summary)
    },
  }
}

export type Follower = ReturnType<typeof createFollower>
