import { McpServer } from '@modelcontextprotocol/server'
import {
  type Call,
  failureOf,
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

export type Use = <T>(work: (call: Call) => Promise<T>) => Promise<T>

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
  cwd: z.string().optional().describe('The folder the thread works in (default: the folder this server runs in, when it starts on this PC)'),
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

const waitInput = z.object({
  thread,
  until: z.enum(['attention', 'end']).optional().describe('attention (default): also return when the thread waits on the user; end: only when it is done'),
  timeoutSeconds: z.number().int().min(0).max(mostWaitSeconds).optional().describe(`Give up after this long (default ${waitSeconds}); the thread keeps running`),
})

const reading = { readOnlyHint: true, openWorldHint: false }
const writing = { destructiveHint: false, openWorldHint: false }

const answer = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

const respond = async (work: () => Promise<unknown>) => {
  try {
    return answer(await work())
  } catch (error) {
    return { ...answer({ error: failureOf(error) }), isError: true }
  }
}

const requestId = (given: string | undefined) => given ?? Bun.randomUUIDv7()

export const threadsServer = (use: Use, here: string) => {
  const server = new McpServer({ name: 'sand-threads', version: '1.0.0' })

  server.registerTool(
    'thread_list',
    {
      description: "List sand's threads on all your reachable PCs, newest first, with each one's status; pc names the PC a thread is on when it isn't this one",
      inputSchema: listInput,
      annotations: reading,
    },
    input => respond(() => use(call => call(threadList, input))),
  )
  server.registerTool(
    'thread_read',
    { description: 'Read what a thread said; each item has a seq to read on from', inputSchema: readInput, annotations: reading },
    ({ thread, ...input }) => respond(() => use(call => call(threadRead, { session: thread, ...input }))),
  )
  server.registerTool(
    'thread_start',
    { description: 'Start a new sand thread with a first message. Returns at once; use thread_wait for the reply', inputSchema: startInput, annotations: writing },
    ({ clientRequestId, ...input }) =>
      respond(() =>
        use(call =>
          call(threadStart, { ...(!input.project && !input.pc && { cwd: here }), ...input, origin: 'mcp', clientRequestId: requestId(clientRequestId) }),
        ),
      ),
  )
  server.registerTool(
    'thread_send',
    { description: 'Send a message to a thread. Returns at once; use thread_wait for the reply', inputSchema: sendInput, annotations: writing },
    ({ thread, clientRequestId, ...input }) =>
      respond(() => use(call => call(threadSend, { session: thread, ...input, origin: 'mcp', clientRequestId: requestId(clientRequestId) }))),
  )
  server.registerTool(
    'thread_wait',
    {
      description:
        "Wait until a thread is done or waits on the user, and get its status and reply. The status is running when it timed out, waiting when it needs the user's answer in sand",
      inputSchema: waitInput,
      annotations: reading,
    },
    ({ thread, until = 'attention', timeoutSeconds = waitSeconds }) =>
      respond(() => use(call => waitThread(call, thread, until, Date.now() + timeoutSeconds * 1000))),
  )
  server.registerTool(
    'thread_stop',
    { description: "Stop a thread's running turn", inputSchema: z.object({ thread }) },
    ({ thread }) => respond(async () => ({ thread, stopped: await use(call => call(threadStop, { session: thread })) })),
  )
  return server
}
