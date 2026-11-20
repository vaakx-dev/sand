import { llm, type Effort } from '@sand/accounts/contract'
import { features } from '@sand/config/contract'
import { levels } from '@sand/model/contract'
import type { ThreadState } from '@sand/orchestrator/contract'
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

const pcField = z.string().optional().describe('Another of your PCs to run it on, by name from pc_list; give it a project or folder there')

const featureOn = (ctx: AgentsContext, feature: string) => ctx.get(features)?.on(feature) ?? true

const inputSchema = (ctx: AgentsContext) => {
  const input = z.object({
    label: z.string().describe('A short title, 3 to 6 words'),
    task: z.string().describe('What to ask or do, in plain words. It works in your folder and is told what you are working on, but not the rest of this chat.'),
    agent: z.string().optional().describe('A named agent from the list (default: a plain agent with your tools)'),
    model: z.string().optional().describe("Model for this agent, from the available models (default: the agent's own model, else yours)"),
    effort: effortInput(ctx).optional().describe('Reasoning effort (default: inherited)'),
    level: z.enum(levels).optional().describe('How heavy the job is, which picks the model the user set for it (default: yours)'),
    project: z.string().optional().describe('A project id to work in instead of your folder, from project_list'),
    folder: z.string().optional().describe('A folder to work in instead of yours; a full path when it runs on another PC'),
    background: z.boolean().optional().describe('Return at once and get its answer later as a <task-notification>, so you can carry on while it does long work'),
  })
  const inWorktrees = featureOn(ctx, 'worktrees') ? input.extend({ worktree: worktreeField }) : input
  return featureOn(ctx, 'pcs') ? inWorktrees.extend({ pc: pcField }) : inWorktrees
}

const started = (thread: string) =>
  `Started subagent ${thread}. Its final reply arrives as a <task-notification>. Meanwhile keep working or end your turn. To message or stop it, use thread_send or thread_stop with thread ${thread}; thread_wait waits for it.`

const followUp = (thread: string) => `(Subagent ${thread}; thread_send asks it more.)`

const answered = ({ thread, status, reply, error }: ThreadState) => {
  if (status === 'completed') return `${reply || '(no reply)'}\n\n${followUp(thread)}`
  if (status === 'interrupted') return `The subagent was stopped before it answered. ${followUp(thread)}`
  if (status === 'running') return started(thread)
  return `The subagent failed${error ? `: ${error}` : ''}. ${followUp(thread)}`
}

export const agentTool = (ctx: AgentsContext, start: StartSubagent): Tool<ReturnType<typeof inputSchema>> => ({
  name: 'agent',
  get description() {
    return describeAgents([], ctx.get(llm))
  },
  parallel: true,
  timeoutMs: Infinity,
  act: ({ label, task }) => ({ effect: 'run', uses: 'agents', summary: `Start a subagent, ${label}: ${task}` }),
  get input() {
    return inputSchema(ctx)
  },
  async run({ effort, background, ...input }, { conversation, call, signal }) {
    const parent = ctx.sessions.require(conversation.id)
    const { thread } = await start({
      ...input,
      ...(effort && { effort: effort as Effort }),
      parent,
      call: call.id,
    })
    if (background) return started(thread)
    return answered(await ctx.orchestrator.answer(thread, { owner: parent.owner, id: parent.id }, signal))
  },
})
