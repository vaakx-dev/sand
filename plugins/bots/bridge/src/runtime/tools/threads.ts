import type { Conversation } from '@sand/engine/contract'
import { readLimit } from '@sand/orchestrator/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { BridgeContext } from '../context'

const listed = 20

const botOf = (ctx: BridgeContext, conversation: Conversation) => {
  const bot = conversation.owner === 'bot' ? ctx.bots.get(conversation.id) : undefined
  if (!bot) throw new Error('Only bots can use this tool')
  return bot
}

const threadOf = (ctx: BridgeContext, thread: string) => {
  const session = ctx.sessions.open(thread)
  if (!session) throw new Error(`No thread ${thread}`)
  return session
}

const active = (conversation: Conversation) => conversation.owner === 'bot'


const listTool = (ctx: BridgeContext): Tool => ({
  name: 'thread_list',
  description: 'List the projects you can start threads in, each with its newest threads',
  input: z.object({}),
  effect: 'read',
  active,
  run() {
    const copies = ctx.projectFiles.copies()
    const threads = ctx.sessions.list().filter(summary => summary.kind === 'thread')
    const projects = copies.filter((copy, at) => copies.findIndex(other => other.project === copy.project) === at).map(({ project, path }) => ({
      project,
      folder: path,
      threads: threads
        .filter(summary => summary.project === project)
        .sort((a, b) => b.updated - a.updated)
        .slice(0, listed)
        .map(summary => ({ thread: summary.id, title: summary.title, updated: summary.updated })),
    }))
    return JSON.stringify(projects)
  },
})

const startInput = z.object({
  project: z.string().describe('The project id, from thread_list'),
  prompt: z.string().min(1).describe('The first message: the task, with what the thread needs to know'),
  title: z.string().optional(),
})

const startTool = (ctx: BridgeContext): Tool<typeof startInput> => ({
  name: 'thread_start',
  description:
    "Start a thread in a project with a first message. It works like any thread the user starts, and says you started it. Returns at once; each time it finishes, its final reply reaches you as a <task-notification>, so don't wait or poll for it",
  input: startInput,
  effect: 'run',
  active,
  async run({ project, prompt, title }, { conversation, call }) {
    const bot = botOf(ctx, conversation)
    const sent = await ctx.orchestrator.start({
      project,
      prompt,
      ...(title && { title }),
      origin: 'bot',
      clientRequestId: `${conversation.id}:${call.id}`,
      from: { owner: 'bot', id: bot.id },
    })
    return JSON.stringify(sent)
  },
})

const sendInput = z.object({
  thread: z.string().describe('The thread id'),
  prompt: z.string().min(1).describe('The message'),
})

const sendTool = (ctx: BridgeContext): Tool<typeof sendInput> => ({
  name: 'thread_send',
  description:
    'Send a message to a thread. Returns at once; a thread you started sends its final reply as a <task-notification>, and thread_read shows the reply of any other',
  input: sendInput,
  effect: 'run',
  active,
  async run({ thread, prompt }, { conversation, call }) {
    const bot = botOf(ctx, conversation)
    const sent = await ctx.orchestrator.send(thread, {
      prompt,
      origin: 'bot',
      clientRequestId: `${conversation.id}:${call.id}`,
      from: { owner: 'bot', id: bot.id },
    })
    return JSON.stringify(sent)
  },
})

const readInput = z.object({
  thread: z.string().describe('The thread id'),
  after: z.number().int().min(0).optional().describe('Return the items after this seq, oldest first; leave it out for the latest items'),
  limit: z.number().int().min(1).max(readLimit).optional().describe('At most this many items (default 50)'),
})

const readTool = (ctx: BridgeContext): Tool<typeof readInput> => ({
  name: 'thread_read',
  description: 'Read a thread: its status and what was said; each item has a seq to read on from',
  input: readInput,
  effect: 'read',
  active,
  async run({ thread, ...options }) {
    threadOf(ctx, thread)
    const state = await ctx.orchestrator.wait(thread, 'attention', AbortSignal.abort())
    return JSON.stringify({ ...state, ...ctx.orchestrator.read(thread, options) })
  },
})

export const threadTools = (ctx: BridgeContext): Tool[] => [listTool(ctx), startTool(ctx), sendTool(ctx), readTool(ctx)]
