import type { Agents, Effort, LLM, Tool, TurnResult } from '@sand/protocol'
import { z } from 'zod'
import { catalog } from './catalog'
import { agentTitle } from './title'

const effortInput = (llm: LLM | undefined) => {
  const [first, ...rest] = llm?.levels?.().map(level => level.id) ?? []
  return first ? z.enum([first, ...rest]) : z.string()
}

const inputSchema = (llm: LLM | undefined) =>
  z.object({
    label: z.string().describe('3 to 6 words naming the task for the UI, for example "Check how sessions are stored"'),
    task: z.string().describe('Complete, self-contained instructions. The subagent cannot see this conversation.'),
    agent: z.string().optional().describe('Which agent to use (default: general)'),
    model: z
      .string()
      .optional()
      .describe('Model for this agent, e.g. "haiku" or "opus" (default: the agent\'s own model, else yours)'),
    effort: effortInput(llm).optional().describe('Reasoning effort (default: inherited)'),
    background: z.boolean().optional().describe('Start without waiting; the result arrives later as a <task-notification>'),
  })

const report = (result: TurnResult) => {
  if (result.stopReason === 'interrupted') return 'The subagent was interrupted before finishing.'
  return result.text || 'The subagent finished without a final report.'
}

export const agentTool = (agents: Agents, llm: LLM | undefined): Tool<ReturnType<typeof inputSchema>> => ({
  name: 'agent',
  description: `Delegate a task to a subagent. It works independently in its own context with its own tools and returns a final report; only that report enters your context. Use it for broad searches, independent pieces of work that can run in parallel, and tasks that would flood your context. Call it several times in one response to run agents in parallel. Set background to keep working while it runs.

${catalog(agents, llm)}`,
  input: inputSchema(llm),
  async run({ label, task, agent, model, effort, background }, { session, signal, call }) {
    const request = { parent: session, task, label, agent, model, effort: effort as Effort | undefined, origin: call.id }
    if (background) {
      const job = agents.background(
        session,
        `${agent ?? 'general'}: ${agentTitle(label, task)}`,
        jobSignal => agents.run({ ...request, signal: jobSignal }).then(report),
        call.id,
      )
      return `Started background agent ${job.id}. Its report will arrive as a <task-notification> message. You don't need to wait for it: keep working on other things, or end your turn and it will wake you when it finishes. Never sleep or poll for it.`
    }
    return report(await agents.run({ ...request, signal }))
  },
})
