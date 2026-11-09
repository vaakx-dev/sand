import { llm, type Effort } from '@sand/accounts/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { describeAgents } from './catalog'
import type { AgentsContext } from './context'
import type { OpenAgent } from './run'

const effortInput = (ctx: AgentsContext) => {
  const [first, ...rest] = ctx.get(llm)?.levels?.().map(level => level.id) ?? []
  return first ? z.enum([first, ...rest]) : z.string()
}

const inputSchema = (ctx: AgentsContext) =>
  z.object({
    label: z.string().describe('A short title, 3 to 6 words'),
    task: z.string().describe("Full instructions. The subagent can't see this chat."),
    agent: z.string().optional().describe('A named agent from the list (default: a plain agent with your tools)'),
    model: z.string().optional().describe("Model for this agent, from the available models (default: the agent's own model, else yours)"),
    effort: effortInput(ctx).optional().describe('Reasoning effort (default: inherited)'),
  })

export const agentTool = (ctx: AgentsContext, open: OpenAgent): Tool<ReturnType<typeof inputSchema>> => ({
  name: 'agent',
  get description() {
    return describeAgents([], ctx.get(llm))
  },
  parallel: true,
  get input() {
    return inputSchema(ctx)
  },
  needs: ['thread'],
  async run({ label, task, agent, model, effort }, { conversation, call }) {
    const parent = ctx.sessions.require(conversation.id)
    const session = await open({ parent, task, label, agent, model, effort: effort as Effort | undefined, origin: call.id })
    await ctx.turns.send(session, { prompt: task, origin: 'agent', clientRequestId: call.id })
    return `Started agent thread ${session.id}. Its report arrives as a <task-notification>. Meanwhile keep working or end your turn; don't sleep or poll for it.`
  },
})
