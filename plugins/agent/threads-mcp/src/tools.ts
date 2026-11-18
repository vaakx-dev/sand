import { filesInput, promptWithFiles } from '@sand/attachments/contract'
import { historyItem, historyReading } from '@sand/chats/contract'
import { compactTimeoutMs, contextCompact } from '@sand/compaction/contract'
import type { McpGroup, McpTool, McpToolContext } from '@sand/mcp-server/contract'
import { historyRead, itemRead, pendingActions, readLimit, threadList, threadPending, threadSend, threadStart, threadStop, threadUpdate, waitThread } from '@sand/orchestrator/contract'
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
  .describe('Any unique string; a repeat call with it returns the first result')
const prompt = z.string().min(1).describe('The message')

const listInput = z.object({
  cwd: z.string().optional().describe('Only threads in this folder'),
  project: z.string().optional().describe('Only threads in this project'),
  mine: z.boolean().optional().describe("Only the subagents you started (sand's own threads and bots); implies subagents"),
  bot: z.string().optional().describe('Only the subagents this bot started; implies subagents'),
  thread: z.string().optional().describe('Only the subagents this thread started; implies subagents'),
  subagents: z.boolean().optional().describe('List subagents instead of threads'),
  limit: z.number().int().min(1).max(readLimit).optional().describe('At most this many, newest first (default 50)'),
})

const historyInput = z.object({
  thread: z.string().optional().describe('A thread id'),
  bot: z.string().optional().describe('A bot id'),
  ...historyReading().shape,
  ...historyItem().shape,
})

const startInput = z.object({
  prompt: z.string().min(1).describe('The first message: the task, with what the thread needs to know'),
  files: filesInput(),
  pc: z.string().optional().describe('Another PC to start it on, by name; cwd is then on that PC'),
  cwd: z.string().optional().describe('Its working folder (default: yours)'),
  project: z.string().optional().describe('A project id to work in instead of a folder, from project_list'),
  quick: z.literal(true).optional().describe('Start it in a scratch folder, with no project'),
  title: z.string().optional(),
  model: z.string().optional().describe('A model id or name (default: sand’s default model)'),
  effort: z.string().optional().describe('Reasoning effort, such as low, medium or high'),
  worktree: z
    .boolean()
    .optional()
    .describe(
      'Give it its own git worktree and branch, removed once the thread is archived',
    ),
  branch: z.string().min(1).optional().describe('An existing local branch for its worktree, instead of a new one. Implies worktree'),
  from: z.string().min(1).optional().describe('The branch or commit its new branch starts from. Implies worktree'),
  clientRequestId,
})

const sendInput = z.object({
  thread,
  prompt,
  files: filesInput(),
  clientRequestId,
})

const stopInput = z.object({ thread })

const pendingInput = z.object({
  thread,
  pending: z.string().min(1).describe('The pending id thread_send returned'),
  action: z.enum(pendingActions).describe('withdraw: drop it; hold: keep it from running; release: let a held one run'),
})

const updateInput = z.object({
  thread,
  title: z.string().min(1).optional().describe('Rename it'),
  pinned: z.boolean().optional().describe('Pin it to the top of the sidebar, or unpin it'),
  snoozeUntil: z.iso.datetime({ offset: true }).nullable().optional().describe('Hide it until this time (ISO 8601), or null to bring it back now'),
  archived: z.boolean().optional().describe('Archive it once its work is done, which stops it; false reopens it'),
  worktree: z
    .literal(true)
    .optional()
    .describe('Move it into its own new git worktree and branch, with its uncommitted changes, when its turn ends'),
  branch: z.string().min(1).optional().describe('A name for the new branch of its worktree (default: named from its work). Implies worktree'),
  model: z.string().min(1).optional().describe('A model id or name to switch to when its turn ends'),
  effort: z.string().min(1).optional().describe('Effort, such as low, medium or high'),
  fast: z.boolean().optional().describe('Turn fast mode on or off, if its model has it'),
})

const compactInput = z.object({
  thread: z.string().optional().describe('A thread id'),
  bot: z.string().optional().describe('A bot id'),
})

const waitInput = z.object({
  thread,
  until: z.enum(['attention', 'end']).optional().describe('attention (default): also when it waits on the user; end: only when done'),
  timeoutSeconds: z.number().int().min(0).max(mostWaitSeconds).optional().describe(`Give up after this long (default ${waitSeconds}); the thread keeps running`),
})

const chatOf = ({ thread, bot }: z.output<typeof compactInput>) => {
  if (thread !== undefined && bot === undefined) return { session: thread, owner: 'thread' } as const
  if (bot !== undefined && thread === undefined) return { session: bot, owner: 'bot' } as const
  throw new Error('Give either a thread or a bot')
}

const requestId = (given: string | undefined) => given ?? Bun.randomUUIDv7()

const folderOf = ({ cwd, project, quick, pc }: Pick<z.output<typeof startInput>, 'cwd' | 'project' | 'quick' | 'pc'>, { here, actor }: McpToolContext) => {
  if (quick || pc || !here) return cwd
  if (cwd !== undefined) return resolve(here, cwd)
  return project || actor ? undefined : here
}

const replies = "Its reply doesn't come back on its own: use thread_wait or history_read, or ask it to message you back"

export const threadTools: McpTool[] = [
  {
    name: 'thread_list',
    description: "List sand's threads, newest first, with each one's status.",
    input: listInput,
    parts: [{ feature: 'pcs', description: 'Covers all your reachable PCs.' }],
    access: 'read',
    group: group.name,
    run: (input, { call }) => call(threadList, input),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'thread_start',
    description: [
      'Start a user-facing sand thread that works on its own; returns its id at once. Only when the user asks for one; hand off your own work to a subagent instead.',
      `${replies}.`,
    ].join(' '),
    input: startInput,
    parts: [
      { feature: 'pcs', fields: ['pc'] },
      {
        feature: 'worktrees',
        fields: ['worktree', 'branch', 'from'],
        description: 'For parallel work, set worktree instead of having it run git worktree add.',
      },
    ],
    access: 'operate',
    act: ({ title, prompt }) => ({ effect: 'run', uses: 'agents', summary: title ? `Start the thread “${title}”: ${prompt}` : `Start a thread: ${prompt}` }),
    group: group.name,
    run: async ({ clientRequestId, from, prompt, files, ...input }, context) =>
      context.call(threadStart, {
        ...input,
        prompt: await promptWithFiles(context.call, prompt, files, context.here),
        ...(from && { base: from }),
        cwd: folderOf(input, context),
        origin: 'mcp',
        clientRequestId: requestId(clientRequestId),
      }),
  } satisfies McpTool<typeof startInput>,
  {
    name: 'thread_send',
    description: `Send a message to a thread. Returns at once. ${replies}.`,
    input: sendInput,
    access: 'operate',
    group: group.name,
    run: async ({ thread, clientRequestId, prompt, files, ...input }, { call, here }) =>
      call(threadSend, { session: thread, ...input, prompt: await promptWithFiles(call, prompt, files, here), origin: 'mcp', clientRequestId: requestId(clientRequestId) }),
  } satisfies McpTool<typeof sendInput>,
  {
    name: 'thread_wait',
    description:
      'Wait until a thread is done or waits on the user, and get its status and reply',
    input: waitInput,
    access: 'read',
    group: group.name,
    run: ({ thread, until = 'attention', timeoutSeconds = waitSeconds }, { call, signal }) =>
      waitThread(call, thread, until, Date.now() + timeoutSeconds * 1000, signal),
  } satisfies McpTool<typeof waitInput>,
  {
    name: 'thread_stop',
    description: "Stop a thread's running turn. Its background commands keep running",
    input: stopInput,
    access: 'operate',
    group: group.name,
    run: async ({ thread }, { call }) => ({ thread, stopped: await call(threadStop, { session: thread }) }),
  } satisfies McpTool<typeof stopInput>,
  {
    name: 'thread_pending',
    description: 'Withdraw, hold or release a message thread_send left waiting for a thread',
    input: pendingInput,
    access: 'operate',
    group: group.name,
    run: async ({ thread, pending, action }, { call }) => ({ thread, pending, changed: await call(threadPending, { session: thread, pending, action }) }),
  } satisfies McpTool<typeof pendingInput>,
  {
    name: 'thread_update',
    description: 'Rename, pin, snooze or archive a thread, or change its model, effort or fast mode.',
    input: updateInput,
    parts: [{ feature: 'worktrees', fields: ['worktree', 'branch'] }],
    access: 'operate',
    group: group.name,
    run: ({ thread, snoozeUntil, fast, ...patch }, { call }) =>
      call(threadUpdate, {
        session: thread,
        ...patch,
        ...(snoozeUntil !== undefined && { snoozed: snoozeUntil === null ? null : Date.parse(snoozeUntil) }),
        ...(fast !== undefined && { speed: fast ? 'fast' : 'normal' }),
      }),
  } satisfies McpTool<typeof updateInput>,
  {
    name: 'chat_compact',
    description:
      "Compact an idle thread's or bot's chat now: summarize its earlier conversation so its next turn carries on from the summary",
    input: compactInput,
    feature: 'compaction',
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(contextCompact, chatOf(input), { timeout: compactTimeoutMs }),
  } satisfies McpTool<typeof compactInput>,
  {
    name: 'history_read',
    description: [
      'Read or search the history of a thread, a bot, or with neither your own, including what compaction or a model switch dropped from your context.',
    ].join(' '),
    input: historyInput,
    access: 'read',
    run: ({ thread, bot, item, offset, ...reading }, { call }) => {
      const conversation = { ...(thread !== undefined && { session: thread }), ...(bot !== undefined && { bot }) }
      return item === undefined ? call(historyRead, { ...conversation, ...reading }) : call(itemRead, { ...conversation, item, offset })
    },
  } satisfies McpTool<typeof historyInput>,
]
