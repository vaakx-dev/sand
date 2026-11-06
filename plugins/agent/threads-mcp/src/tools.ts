import type { McpTool } from '@sand/mcp-server/contract'
import {
  readLimit,
  threadList,
  threadRead,
  threadSend,
  threadStart,
  threadStop,
  threadViews,
  waitThread,
} from '@sand/orchestrator/contract'
import { sendModes } from '@sand/turns-contract/contract'
import { z } from 'zod'

const waitSeconds = 600
const mostWaitSeconds = 3600

const thread = z.string().describe('The thread id')
const clientRequestId = z
  .string()
  .min(1)
  .optional()
  .describe('Any unique string; calling again with the same id returns the first result instead of doing the work twice')
const prompt = z.string().min(1).describe('The message')

const listInput = z.object({
  cwd: z.string().optional().describe('Only threads in this folder'),
  project: z.string().optional().describe('Only threads in this project'),
  limit: z.number().int().min(1).max(readLimit).optional().describe('At most this many, newest first (default 50)'),
})

const readInput = z.object({
  thread,
  after: z.number().int().min(0).optional().describe('Return the items after this seq, oldest first; leave it out for the latest items'),
  limit: z.number().int().min(1).max(readLimit).optional().describe('At most this many items (default 50)'),
  view: z.enum(threadViews).optional().describe('messages: what was said (default); activity: also the tool calls and their results'),
})

const startInput = z.object({
  prompt,
  pc: z.string().optional().describe('Another of your PCs to start it on, by name; cwd is then a folder on that PC (default: this PC)'),
  cwd: z.string().optional().describe('The folder the thread works in, on the PC it starts on (sand mcp on stdio defaults to the folder it runs in)'),
  project: z.string().optional().describe('A project id to work in instead of a folder'),
  title: z.string().optional(),
  model: z.string().optional().describe('A model id or name (default: sand’s default model)'),
  effort: z.string().optional().describe('Reasoning effort, such as low, medium or high'),
  worktree: z.boolean().optional().describe('Work in a new git worktree on its own branch'),
  clientRequestId,
})

const sendInput = z.object({
  thread,
  prompt,
  mode: z.enum(sendModes).optional().describe('auto (default): a running turn takes it at its next step, an idle thread starts a turn; queue: run it as the next turn'),
  clientRequestId,
})

const stopInput = z.object({ thread })

const waitInput = z.object({
  thread,
  until: z.enum(['attention', 'end']).optional().describe('attention (default): also return when the thread waits on the user; end: only when it is done'),
  timeoutSeconds: z.number().int().min(0).max(mostWaitSeconds).optional().describe(`Give up after this long (default ${waitSeconds}); the thread keeps running`),
})

const requestId = (given: string | undefined) => given ?? Bun.randomUUIDv7()

export const threadTools: McpTool[] = [
  {
    name: 'thread_list',
    description: "List sand's threads on all your reachable PCs, newest first, with each one's status; pc names the PC a thread is on when it isn't this one",
    input: listInput,
    access: 'read',
    run: (input, { call }) => call(threadList, input),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'thread_read',
    description: 'Read what a thread said; each item has a seq to read on from',
    input: readInput,
    access: 'read',
    run: ({ thread, ...input }, { call }) => call(threadRead, { session: thread, ...input }),
  } satisfies McpTool<typeof readInput>,
  {
    name: 'thread_start',
    description: 'Start a new sand thread with a first message. Returns at once; use thread_wait for the reply',
    input: startInput,
    access: 'operate',
    run: ({ clientRequestId, ...input }, { call, here }) =>
      call(threadStart, { ...(here && !input.project && !input.pc && { cwd: here }), ...input, origin: 'mcp', clientRequestId: requestId(clientRequestId) }),
  } satisfies McpTool<typeof startInput>,
  {
    name: 'thread_send',
    description: 'Send a message to a thread. Returns at once; use thread_wait for the reply',
    input: sendInput,
    access: 'operate',
    run: ({ thread, clientRequestId, ...input }, { call }) => call(threadSend, { session: thread, ...input, origin: 'mcp', clientRequestId: requestId(clientRequestId) }),
  } satisfies McpTool<typeof sendInput>,
  {
    name: 'thread_wait',
    description:
      "Wait until a thread is done or waits on the user, and get its status and reply. The status is running when it timed out, waiting when it needs the user's answer in sand",
    input: waitInput,
    access: 'read',
    run: ({ thread, until = 'attention', timeoutSeconds = waitSeconds }, { call }) => waitThread(call, thread, until, Date.now() + timeoutSeconds * 1000),
  } satisfies McpTool<typeof waitInput>,
  {
    name: 'thread_stop',
    description: "Stop a thread's running turn",
    input: stopInput,
    access: 'operate',
    run: async ({ thread }, { call }) => ({ thread, stopped: await call(threadStop, { session: thread }) }),
  } satisfies McpTool<typeof stopInput>,
]
