import { llm, type Effort } from '@sand/accounts/contract'
import type { Job } from '@sand/jobs/contract'
import type { TurnResult } from '@sand/loop/contract'
import { steering } from '@sand/steering/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { describeAgents } from './catalog'
import type { AgentsContext } from './context'
import type { AgentRequest } from './contract'
import { builtins } from './definitions'
import type { OpenedAgent } from './run'
import { agentTitle } from './title'
import { readThread } from './transcript'

const effortInput = (ctx: AgentsContext) => {
  const [first, ...rest] = ctx.get(llm)?.levels?.().map(level => level.id) ?? []
  return first ? z.enum([first, ...rest]) : z.string()
}

const inputSchema = (ctx: AgentsContext) =>
  z.object({
    label: z.string().describe('3 to 6 words for the UI'),
    task: z.string().describe("Full instructions. The subagent can't see this chat."),
    agent: z.string().optional().describe('Which agent to use (default: general)'),
    model: z.string().optional().describe("Model for this agent, from the available models (default: the agent's own model, else yours)"),
    effort: effortInput(ctx).optional().describe('Reasoning effort (default: inherited)'),
    background: z.boolean().optional().describe('Return now. The report arrives later as a <task-notification>.'),
  })

const report = (result: TurnResult) => {
  if (result.stopReason === 'interrupted') return 'The subagent was interrupted before finishing.'
  return result.text || 'The subagent finished without a final report.'
}

export type OpenAgent = (request: AgentRequest) => Promise<OpenedAgent>

const messenger = (ctx: AgentsContext, agent: OpenedAgent) => (message: string, job: Job) => {
  if (job.status === 'running') {
    if (!ctx.get(steering)?.steer(agent.session, message)) throw new Error(`${job.id} can't take messages right now`)
    return `Sent to ${job.id}.`
  }
  ctx.backgroundJobs.resume(job, signal => agent.follow(message, signal).then(report))
  return `${job.id} is working on your follow-up in thread ${agent.session.id}. Its report arrives as a <task-notification>.`
}

export const agentTool = (ctx: AgentsContext, open: OpenAgent): Tool<ReturnType<typeof inputSchema>> => ({
  name: 'agent',
  get description() {
    return describeAgents(builtins, ctx.get(llm))
  },
  parallel: true,
  get input() {
    return inputSchema(ctx)
  },
  async run({ label, task, agent, model, effort, background }, { session, signal, call }) {
    const request = { parent: session, task, label, agent, model, effort: effort as Effort | undefined, origin: call.id }
    if (!background) {
      const opened = await open({ ...request, signal })
      return `${report(await opened.run(signal))}\n\n[thread ${opened.session.id}]`
    }
    const opened = await open(request)
    const job = ctx.backgroundJobs.start({
      kind: 'agent',
      parent: session,
      label: `${agent ?? 'general'}: ${agentTitle(label, task)}`,
      origin: call.id,
      work: jobSignal => opened.run(jobSignal).then(report),
      read: cursor => readThread(opened.session, cursor),
      send: messenger(ctx, opened),
    })
    return `Started background agent ${job.id} in thread ${opened.session.id}. Its report arrives as a <task-notification>. Keep working or end your turn; it will wake you. Don't sleep or poll.`
  },
})
