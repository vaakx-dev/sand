import { llm, type Effort } from '@sand/accounts/contract'
import type { Job } from '@sand/jobs/contract'
import type { Tool } from '@sand/tools/contract'
import type { TurnResult } from '@sand/turns-contract/contract'
import { z } from 'zod'
import { describeAgents } from './catalog'
import type { AgentsContext } from './context'
import type { AgentRequest } from './contract'
import type { OpenedAgent } from './run'
import { agentTitle } from './title'
import { readThread } from './transcript'

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

const report = (result: TurnResult) => {
  if (result.stopReason === 'interrupted') return 'The subagent was interrupted before finishing.'
  return result.text || 'The subagent finished without a final report.'
}

export type OpenAgent = (request: AgentRequest) => Promise<OpenedAgent>

const messenger = (ctx: AgentsContext, agent: OpenedAgent) => async (message: string, job: Job) => {
  if (job.status === 'running') {
    await ctx.turns.send(agent.session, { prompt: message, mode: 'steer', origin: 'agent', clientRequestId: Bun.randomUUIDv7() })
    return `Sent to ${job.id}.`
  }
  ctx.backgroundJobs.resume(job, signal => agent.follow(message, signal).then(report))
  return `${job.id} is working on your follow-up in thread ${agent.session.id}. Its report arrives as a <task-notification>.`
}

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
    const session = ctx.sessions.require(conversation.id)
    const opened = await open({ parent: session, task, label, agent, model, effort: effort as Effort | undefined, origin: call.id })
    const job = ctx.backgroundJobs.start({
      kind: 'agent',
      parent: session,
      label: agent ? `${agent}: ${agentTitle(label, task)}` : agentTitle(label, task),
      origin: call.id,
      work: jobSignal => opened.run(jobSignal).then(report),
      read: cursor => readThread(opened.session, cursor),
      send: messenger(ctx, opened),
    })
    return `Started background agent ${job.id} in thread ${opened.session.id}. Its report arrives as a <task-notification>. Meanwhile keep working or end your turn; don't sleep or poll for it.`
  },
})
