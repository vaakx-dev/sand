import { historyItem, historyReading } from '@sand/chats/contract'
import type { McpGroup, McpTool } from '@sand/mcp-server/contract'
import { historyRead, itemRead, readLimit, threadList, threadSend, threadStart, threadStop, threadUpdate, waitThread } from '@sand/orchestrator/contract'
import { sendModes } from '@sand/turns-contract/contract'
import { resolve } from 'node:path'
import { z } from 'zod'

export const group: McpGroup = { name: 'threads', label: 'Threads', summary: 'list, start, message, wait for, stop and manage threads, the user-facing work in sand' }

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
  mine: z.boolean().optional().describe("Only threads you started (sand's own threads and bots)"),
  limit: z.number().int().min(1).max(readLimit).optional().describe('At most this many, newest first (default 50)'),
})

const historyInput = z.object({
  thread: z.string().optional().describe('A thread id'),
  bot: z.string().optional().describe('A bot id'),
  ...historyReading.shape,
  ...historyItem.shape,
})

const startInput = z.object({
  prompt: z.string().min(1).describe('The first message: the task, with what the thread needs to know'),
  pc: z.string().optional().describe('Another of your PCs to start it on, by name; cwd is then a folder on that PC (default: this PC)'),
  cwd: z.string().optional().describe('The folder the thread works in, on the PC it starts on (default: yours; a bot with one project starts it there)'),
  project: z.string().optional().describe('A project id to work in instead of a folder, from project_list'),
  title: z.string().optional(),
  model: z.string().optional().describe('A model id or name (default: sand’s default model)'),
  effort: z.string().optional().describe('Reasoning effort, such as low, medium or high'),
  worktree: z
    .boolean()
    .optional()
    .describe(
      "Give the thread its own checkout: a git worktree and branch that sand makes, sets up as its working folder, and removes once the thread settles. Use this instead of git worktree add or telling the thread to make one",
    ),
  branch: z.string().min(1).optional().describe('An existing local branch for its worktree, instead of a new one. Implies worktree'),
  from: z.string().min(1).optional().describe("The branch or commit its worktree's new branch starts from (default: the default branch). Implies worktree"),
  clientRequestId,
})

const sendInput = z.object({
  thread,
  prompt,
  mode: z.enum(sendModes).optional().describe('auto (default): a running turn takes it at its next step, an idle thread starts a turn; queue: run it as the next turn'),
  clientRequestId,
})

const stopInput = z.object({ thread })

const updateInput = z.object({
  thread,
  title: z.string().min(1).optional().describe('Rename it'),
  pinned: z.boolean().optional().describe('Pin it to the top of the sidebar, or unpin it'),
  snoozeUntil: z.iso.datetime({ offset: true }).nullable().optional().describe('Hide it until this time (ISO 8601), or null to bring it back now'),
  settled: z.boolean().optional().describe('Settle it once its work is done, which stops it and moves it out of the open list; false reopens it'),
  worktree: z
    .literal(true)
    .optional()
    .describe('Move it into its own new git worktree and branch, taking its uncommitted changes. A thread in a turn, such as you, moves when the turn ends'),
  branch: z.string().min(1).optional().describe('A name for the new branch of its worktree (default: named from its work). Implies worktree'),
})

const waitInput = z.object({
  thread,
  until: z.enum(['attention', 'end']).optional().describe('attention (default): also return when the thread waits on the user; end: only when it is done'),
  timeoutSeconds: z.number().int().min(0).max(mostWaitSeconds).optional().describe(`Give up after this long (default ${waitSeconds}); the thread keeps running`),
})

const requestId = (given: string | undefined) => given ?? Bun.randomUUIDv7()

const folderOf = ({ cwd, project, pc }: z.output<typeof startInput>, here: string | undefined) => {
  if (pc || !here) return cwd
  if (cwd !== undefined) return resolve(here, cwd)
  return project ? undefined : here
}

const reported = "If you are a sand thread or bot, each final reply comes to you as a <task-notification>, so don't wait or poll for it"

export const threadTools: McpTool[] = [
  {
    name: 'thread_list',
    description: "List sand's threads on all your reachable PCs, newest first, with each one's status; pc names the PC a thread is on when it isn't this one",
    input: listInput,
    access: 'read',
    group: group.name,
    run: (input, { call }) => call(threadList, input),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'thread_start',
    description: [
      'Start a new sand thread with a first message: user-facing work that the user sees in their thread list and can join. It works on its own. Returns its id at once.',
      'For work in parallel or on its own branch, set worktree so sand gives it its own checkout; never have it run git worktree add.',
      `${reported}; otherwise use thread_wait`,
    ].join(' '),
    input: startInput,
    access: 'operate',
    group: group.name,
    run: ({ clientRequestId, from, ...input }, { call, here }) =>
      call(threadStart, { ...input, ...(from && { base: from }), cwd: folderOf(input, here), origin: 'mcp', clientRequestId: requestId(clientRequestId) }),
  } satisfies McpTool<typeof startInput>,
  {
    name: 'thread_send',
    description: `Send a message to a thread. Returns at once. ${reported}; otherwise use history_read or thread_wait for its reply`,
    input: sendInput,
    access: 'operate',
    group: group.name,
    run: ({ thread, clientRequestId, ...input }, { call }) => call(threadSend, { session: thread, ...input, origin: 'mcp', clientRequestId: requestId(clientRequestId) }),
  } satisfies McpTool<typeof sendInput>,
  {
    name: 'thread_wait',
    description:
      "Wait until a thread is done or waits on the user, and get its status and reply. The status is running when it timed out, waiting when it needs the user's answer in sand",
    input: waitInput,
    access: 'read',
    group: group.name,
    agents: ['thread'],
    run: ({ thread, until = 'attention', timeoutSeconds = waitSeconds }, { call, signal }) =>
      waitThread(call, thread, until, Date.now() + timeoutSeconds * 1000, signal),
  } satisfies McpTool<typeof waitInput>,
  {
    name: 'thread_stop',
    description: "Stop a thread's running turn",
    input: stopInput,
    access: 'operate',
    group: group.name,
    run: async ({ thread }, { call }) => ({ thread, stopped: await call(threadStop, { session: thread }) }),
  } satisfies McpTool<typeof stopInput>,
  {
    name: 'thread_update',
    description: 'Rename, pin, snooze or settle a thread, or move it into its own git worktree; returns the thread as thread_list shows it',
    input: updateInput,
    access: 'operate',
    group: group.name,
    run: ({ thread, snoozeUntil, ...patch }, { call }) =>
      call(threadUpdate, { session: thread, ...patch, ...(snoozeUntil !== undefined && { snoozed: snoozeUntil === null ? null : Date.parse(snoozeUntil) }) }),
  } satisfies McpTool<typeof updateInput>,
  {
    name: 'history_read',
    description: [
      'Read or search the history of a thread, a bot, or, leaving both out, your own: what was said and when, what was done, and the notifications that came in, including what compaction or a model switch left out of your context.',
      'Each item has its seq, when it happened and its turn; more says there are items past the page: older ones, or newer ones when after is set.',
      'Pass item to read one item in full; a long one comes in parts, continued from nextOffset',
    ].join(' '),
    input: historyInput,
    access: 'read',
    run: ({ thread, bot, item, offset, ...reading }, { call }) => {
      const conversation = { ...(thread !== undefined && { session: thread }), ...(bot !== undefined && { bot }) }
      return item === undefined ? call(historyRead, { ...conversation, ...reading }) : call(itemRead, { ...conversation, item, offset })
    },
  } satisfies McpTool<typeof historyInput>,
]
