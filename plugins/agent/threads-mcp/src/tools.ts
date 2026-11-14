import { filesInput, promptWithFiles } from '@sand/attachments/contract'
import { historyItem, historyReading } from '@sand/chats/contract'
import { compactTimeoutMs, contextCompact } from '@sand/compaction/contract'
import type { McpGroup, McpTool } from '@sand/mcp-server/contract'
import { historyRead, itemRead, pendingActions, readLimit, threadList, threadPending, threadSend, threadStart, threadStop, threadUpdate, waitThread } from '@sand/orchestrator/contract'
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
  pc: z.string().optional().describe('Another of your PCs to start it on, by name; cwd is then a folder on that PC (default: this PC)'),
  cwd: z.string().optional().describe('The folder the thread works in, on the PC it starts on (default: yours; a bot with one project starts it there)'),
  project: z.string().optional().describe('A project id to work in instead of a folder, from project_list'),
  quick: z.literal(true).optional().describe('Start it with no project, in a scratch folder of its own, instead of cwd or project'),
  title: z.string().optional(),
  model: z.string().optional().describe('A model id or name (default: sand’s default model)'),
  effort: z.string().optional().describe('Reasoning effort, such as low, medium or high'),
  worktree: z
    .boolean()
    .optional()
    .describe(
      "Give the thread its own checkout: a git worktree and branch that sand makes, sets up as its working folder, and removes once the thread is archived. Use this instead of git worktree add or telling the thread to make one",
    ),
  branch: z.string().min(1).optional().describe('An existing local branch for its worktree, instead of a new one. Implies worktree'),
  from: z.string().min(1).optional().describe("The branch or commit its worktree's new branch starts from (default: the default branch). Implies worktree"),
  clientRequestId,
})

const sendInput = z.object({
  thread,
  prompt,
  files: filesInput(),
  mode: z.enum(sendModes).optional().describe('auto (default): a running turn takes it at its next step, an idle thread starts a turn; queue: run it as the next turn'),
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
  archived: z.boolean().optional().describe('Archive it once its work is done, which stops it and moves it out of the open list; false reopens it'),
  worktree: z
    .literal(true)
    .optional()
    .describe('Move it into its own new git worktree and branch, taking its uncommitted changes. A thread in a turn, such as you, moves when the turn ends'),
  branch: z.string().min(1).optional().describe('A name for the new branch of its worktree (default: named from its work). Implies worktree'),
  model: z.string().min(1).optional().describe('Switch it to this model, by id or name (see model_list). A thread in a turn, such as you, switches when the turn ends'),
  effort: z.string().min(1).optional().describe("Its effort level, such as low, medium or high, if its model has effort levels"),
  fast: z.boolean().optional().describe('Turn fast mode on or off, if its model has it'),
})

const compactInput = z.object({
  thread: z.string().optional().describe('A thread id'),
  bot: z.string().optional().describe('A bot id'),
})

const waitInput = z.object({
  thread,
  until: z.enum(['attention', 'end']).optional().describe('attention (default): also return when the thread waits on the user; end: only when it is done'),
  timeoutSeconds: z.number().int().min(0).max(mostWaitSeconds).optional().describe(`Give up after this long (default ${waitSeconds}); the thread keeps running`),
})

const chatOf = ({ thread, bot }: z.output<typeof compactInput>) => {
  if (thread !== undefined && bot === undefined) return { session: thread, owner: 'thread' } as const
  if (bot !== undefined && thread === undefined) return { session: bot, owner: 'bot' } as const
  throw new Error('Give either a thread or a bot')
}

const requestId = (given: string | undefined) => given ?? Bun.randomUUIDv7()

const folderOf = ({ cwd, project, quick, pc }: Pick<z.output<typeof startInput>, 'cwd' | 'project' | 'quick' | 'pc'>, here: string | undefined) => {
  if (quick || pc || !here) return cwd
  if (cwd !== undefined) return resolve(here, cwd)
  return project ? undefined : here
}

const replies = "Its reply doesn't come back to you on its own: read it with thread_wait or history_read, or, as a sand thread or bot, ask in the message for it to message you back"

export const threadTools: McpTool[] = [
  {
    name: 'thread_list',
    description: "List sand's threads, newest first, with each one's status.",
    input: listInput,
    parts: [{ feature: 'pcs', description: "It lists the threads on all your reachable PCs; pc names the PC a thread is on when it isn't this one." }],
    access: 'read',
    group: group.name,
    run: (input, { call }) => call(threadList, input),
  } satisfies McpTool<typeof listInput>,
  {
    name: 'thread_start',
    description: [
      'Start a new sand thread with a first message: user-facing work that the user sees in their thread list and can join. It works on its own. Returns its id at once.',
      'Start one when the user asks for a thread; to hand off work of your own, start a subagent with the agent tool instead.',
      `${replies}.`,
    ].join(' '),
    input: startInput,
    parts: [
      { feature: 'pcs', fields: ['pc'] },
      {
        feature: 'worktrees',
        fields: ['worktree', 'branch', 'from'],
        description: 'For work in parallel or on its own branch, set worktree so sand gives it its own checkout; never have it run git worktree add.',
      },
    ],
    access: 'operate',
    act: ({ title, prompt }) => ({ effect: 'run', uses: 'agents', summary: title ? `Start the thread “${title}”: ${prompt}` : `Start a thread: ${prompt}` }),
    group: group.name,
    run: async ({ clientRequestId, from, prompt, files, ...input }, { call, here }) =>
      call(threadStart, {
        ...input,
        prompt: await promptWithFiles(call, prompt, files, here),
        ...(from && { base: from }),
        cwd: folderOf(input, here),
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
    description: "Stop a thread's running turn and the background commands it started",
    input: stopInput,
    access: 'operate',
    group: group.name,
    run: async ({ thread }, { call }) => ({ thread, stopped: await call(threadStop, { session: thread }) }),
  } satisfies McpTool<typeof stopInput>,
  {
    name: 'thread_pending',
    description: 'Withdraw, hold or release a message that waits for a thread: one thread_send steered or queued',
    input: pendingInput,
    access: 'operate',
    group: group.name,
    run: async ({ thread, pending, action }, { call }) => ({ thread, pending, changed: await call(threadPending, { session: thread, pending, action }) }),
  } satisfies McpTool<typeof pendingInput>,
  {
    name: 'thread_update',
    description: 'Rename, pin, snooze or archive a thread, or change its model, effort or fast mode; returns the thread as thread_list shows it.',
    input: updateInput,
    parts: [{ feature: 'worktrees', fields: ['worktree', 'branch'], description: 'With worktree, it moves the thread into its own git worktree and branch.' }],
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
      "Compact a thread's or bot's chat now instead of waiting for it to compact by itself: summarize its earlier conversation, so its next turn carries on from the summary. The chat must be idle. Returns its context size in tokens before and after",
    input: compactInput,
    feature: 'compaction',
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(contextCompact, chatOf(input), { timeout: compactTimeoutMs }),
  } satisfies McpTool<typeof compactInput>,
  {
    name: 'history_read',
    description: [
      'Read or search the history of a thread, a bot, or with neither your own: messages, actions and notifications, including what compaction or a model switch dropped from your context.',
      'Items have a seq, time and turn; more means there are items past the page (older, or newer when after is set).',
      'Pass item to read one in full; a long one comes in parts, continued from nextOffset.',
    ].join(' '),
    input: historyInput,
    access: 'read',
    run: ({ thread, bot, item, offset, ...reading }, { call }) => {
      const conversation = { ...(thread !== undefined && { session: thread }), ...(bot !== undefined && { bot }) }
      return item === undefined ? call(historyRead, { ...conversation, ...reading }) : call(itemRead, { ...conversation, item, offset })
    },
  } satisfies McpTool<typeof historyInput>,
]
