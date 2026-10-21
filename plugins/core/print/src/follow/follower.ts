import type { ContextUsage } from '@sand/compaction/contract'
import type { Artifact } from '@sand/html/contract'
import { emptyUsage, sumUsage } from '@sand/usage/records'
import type { Limits, LLMEvent } from '@sand/accounts/contract'
import type { TurnResult } from '@sand/loop/contract'
import type { ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
import type { Printer, Summary } from '../print/printer'
import { createCompactionLines } from './compaction'
import { createTracker } from './tracker'

export const createFollower = (root: string, printer: Printer) => {
  const tracker = createTracker()
  const compaction = createCompactionLines()
  const summary: Summary = { usage: emptyUsage() }
  const mine = (session: string) => session === root
  let turned = false

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
      if (!mine(session)) return
      summary.context = usage
      const line = compaction.change(usage)
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
    turnEnd(session: string, result: TurnResult) {
      if (!mine(session)) return
      summary.usage = sumUsage(summary.usage, result.usage)
      if (result.stopReason === 'interrupted') printer.progress('■ interrupted')
      tracker.turnEnded()
    },
    async finish(signal: AbortSignal) {
      await tracker.settled(signal)
      printer.done(summary)
    },
  }
}

export type Follower = ReturnType<typeof createFollower>
