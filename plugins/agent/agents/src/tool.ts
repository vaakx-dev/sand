import type { Effort, LLM } from '@sand/llm-accounts/contract'
import type { TurnResult } from '@sand/loops/contract'
import type { Tool } from '@sand/tools/contract'
import type { AgentDefinition, Agents } from './contract'
import { z } from 'zod'
import { catalog } from './catalog'
import { agentTitle } from './title'

const effortInput = (llm: LLM | undefined) => {
  const [first, ...rest] = llm?.levels?.().map(level => level.id) ?? []
  return first ? z.enum([first, ...rest]) : z.string()
}

const inputSchema = (llm: LLM | undefined) =>
  z.object({
    label: z.string().describe('3 to 6 words for the UI'),
    task: z.string().describe("Full instructions. The subagent can't see this chat."),
    agent: z.string().optional().describe('Which agent to use (default: general)'),
    model: z
      .string()
      .optional()
      .describe('Model for this agent, e.g. "haiku" or "opus" (default: the agent\'s own model, else yours)'),
    effort: effortInput(llm).optional().describe('Reasoning effort (default: inherited)'),
    background: z.boolean().optional().describe('Return now. The report arrives later as a <task-notification>.'),
  })

const report = (result: TurnResult) => {
  if (result.stopReason === 'interrupted') return 'The subagent was interrupted before finishing.'
  return result.text || 'The subagent finished without a final report.'
}

export const describeAgents = (list: AgentDefinition[], llm: LLM | undefined) =>
  `Delegate a task to a subagent. Use for broad searches, parallel work, or anything that would flood your context. Only its final report comes back. Several calls in one response run in parallel.

${catalog(list, llm)}`

export const agentTool = (
  agents: Agents,
  list: AgentDefinition[],
  llm: LLM | undefined,
): Tool<ReturnType<typeof inputSchema>> => ({
  name: 'agent',
  description: describeAgents(list, llm),
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
      return `Started background agent ${job.id}. Its report arrives as a <task-notification>. Keep working or end your turn; it will wake you. Don't sleep or poll.`
    }
    return report(await agents.run({ ...request, signal }))
  },
})
