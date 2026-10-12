import { isInside, liveProjects, plural, projectCopy } from '@sand/kit'
import type { Pcs } from '@sand/pc-link/contract'
import type { Session, SessionSummary } from '@sand/sessions-sqlite/contract'
import type { Tool } from '@sand/tools/contract'
import type { SettleResult, WorktreeEntry, WorktreeState } from '@sand/worktrees/contract'
import { z } from 'zod'

const group = 'worktrees'

const listInput = z.object({
  thread: z.string().optional().describe("A thread id or name; lists the worktrees of its project. Defaults to this thread's"),
  project: z.string().optional().describe('Or a project name or id'),
  pc: z.string().optional().describe('PC name or id. Defaults to the PC of the thread, or this PC for a project'),
})

type ListInput = z.output<typeof listInput>

const threadsIn = (threads: SessionSummary[], entry: WorktreeEntry) =>
  threads.filter(thread => thread.kind !== 'agent' && (thread.cwd === entry.path || isInside(thread.cwd, entry.path)))

const entryLine = (threads: SessionSummary[]) => (entry: WorktreeEntry) => {
  const inside = threadsIn(threads, entry).map(thread => `"${thread.title ?? 'Untitled'}" (${thread.id})`)
  const facts = [
    `- ${entry.path}`,
    entry.branch ? `branch ${entry.branch}` : 'no branch',
    ...(entry.main ? ['main checkout'] : []),
    ...(entry.changed ? [plural(entry.changed, 'uncommitted change')] : []),
  ]
  return [facts.join(' · '), ...(inside.length ? [`  threads: ${inside.join(', ')}`] : [])].join('\n')
}

const folderOf = async (pcs: Pcs, { thread, project, pc }: ListInput, own: Session) => {
  if (project && !thread) {
    const place = await pcs.find(pc)
    const found = await pcs.project(project)
    return { place, cwd: projectCopy(found, place).path, name: found.name }
  }
  const found = await pcs.threadOrOwn(own, thread, pc)
  const projects = liveProjects([await pcs.projects(found.pc)])
  return { place: found.pc, cwd: found.thread.cwd, name: projects.find(candidate => candidate.id === found.thread.project)?.name }
}

export const worktreesTool = (pcs: Pcs): Tool<typeof listInput> => ({
  name: 'worktrees',
  group,
  description: 'List the git worktrees of a project or thread on any PC, with their branches, uncommitted changes and the threads in each.',
  input: listInput,
  async run(request, { session }) {
    const { place, cwd, name } = await folderOf(pcs, request, session)
    const [state, threads] = await Promise.all([pcs.call<WorktreeState | null>({ type: 'worktrees.list', cwd }, place.id), pcs.threads(place)])
    if (!state) return `${cwd} on ${place.name} isn't in a git repository.`
    return [`Worktrees of ${name || state.name} on ${place.name}:`, ...state.worktrees.map(entryLine(threads))].join('\n')
  },
})

const removeInput = z.object({
  thread: z.string().describe('Thread id or name whose worktree to remove'),
  pc: z.string().optional().describe("The thread's PC, by name or id. Found by itself when left out"),
  force: z.boolean().default(false).describe('Remove even with uncommitted changes or unpushed commits, which are lost. Only when the user asked for that'),
})

const refusal = (result: Exclude<SettleResult, { settled: true }>, named: string) => {
  if (result.reason === 'running') return `${named} is running a turn; nothing was removed. Try again once it is idle.`
  if (result.reason === 'local') return `${named} is not in a worktree; nothing was removed.`
  const what = result.reason === 'changed' ? plural(result.changed ?? 0, 'uncommitted change') : plural(result.ahead ?? 0, 'unpushed commit')
  return `The worktree of ${named} has ${what}; nothing was removed. Commit and push them, or pass force if the user wants them thrown away.`
}

export const removeWorktreeTool = (pcs: Pcs): Tool<typeof removeInput> => ({
  name: 'worktree_remove',
  group,
  description: "Remove a thread's git worktree and its branch on any PC. The thread moves back to the main checkout. Refuses when there is uncommitted or unpushed work unless forced.",
  input: removeInput,
  async run({ thread, pc, force }, { session }) {
    const found = await pcs.thread(thread, pc)
    if (found.pc.here && found.thread.id === session.id) throw new Error("This thread is running, so it can't remove its own worktree")
    const named = `"${found.thread.title ?? found.thread.id}" on ${found.pc.name}`
    const result = await pcs.call<SettleResult>({ type: 'worktrees.remove', session: found.thread.id, force }, found.pc.id)
    if (!result.settled) return refusal(result, named)
    return `Removed the worktree at ${result.removed.path} (branch ${result.removed.branch}) of ${named}. The thread now works in its main checkout.`
  },
})
