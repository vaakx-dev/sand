import { llm, type Effort } from '@sand/accounts/contract'
import { features } from '@sand/config/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { describeAgents } from './catalog'
import type { AgentsContext } from './context'
import type { StartSubagent } from './start'

const effortInput = (ctx: AgentsContext) => {
  const [first, ...rest] = ctx.get(llm)?.levels?.().map(level => level.id) ?? []
  return first ? z.enum([first, ...rest]) : z.string()
}

const worktreeField = z.boolean().optional().describe('Give it its own git worktree and branch, so its edits stay apart from yours and from other agents')

const inputSchema = (ctx: AgentsContext) => {
  const input = z.object({
    label: z.string().describe('A short title, 3 to 6 words'),
    task: z.string().describe("Full instructions. The subagent can't see this chat."),
    agent: z.string().optional().describe('A named agent from the list (default: a plain agent with your tools)'),
    model: z.string().optional().describe("Model for this agent, from the available models (default: the agent's own model, else yours)"),
    effort: effortInput(ctx).optional().describe('Reasoning effort (default: inherited)'),
    project: z.string().optional().describe('A project id to work in instead of your folder, from project_list'),
  })
  return (ctx.get(features)?.on('worktrees') ?? true) ? input.extend({ worktree: worktreeField }) : input
}

const started = (thread: string, owner: string) =>
  `Started subagent ${thread}. Its final reply arrives as a <task-notification>. Meanwhile keep working or end your turn; don't sleep or poll for it. To message or stop it, use thread_send or thread_stop with thread ${thread}${owner === 'thread' ? '; thread_wait waits for it' : ''}.`

export const agentTool = (ctx: AgentsContext, start: StartSubagent): Tool<ReturnType<typeof inputSchema>> => ({
  name: 'agent',
  get description() {
    return describeAgents([], ctx.get(llm))
  },
  parallel: true,
  get input() {
    return inputSchema(ctx)
  },
  async run({ effort, ...input }, { conversation, call }) {
    const { thread } = await start({
      ...input,
      ...(effort && { effort: effort as Effort }),
      from: { owner: conversation.owner, id: conversation.id },
      ...(conversation.owner === 'thread' && { parent: ctx.sessions.require(conversation.id) }),
      call: call.id,
    })
    return started(thread, conversation.owner)
  },
})
