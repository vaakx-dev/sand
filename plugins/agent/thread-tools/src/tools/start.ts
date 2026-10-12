import { projectCopy } from '@sand/kit'
import type { Pc, Pcs } from '@sand/pc-link/contract'
import type { Effort } from '@sand/protocol'
import type { SessionInfo } from '@sand/sessions-sqlite/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'

const efforts: [Effort, ...Effort[]] = ['low', 'medium', 'high', 'xhigh', 'max']

const input = z.object({
  prompt: z.string().describe('The first message of the new thread'),
  pc: z.string().optional().describe('PC name or id. Defaults to this PC'),
  project: z.string().optional().describe("Project name or id. Defaults to this thread's project"),
  cwd: z.string().optional().describe('Folder on that PC, instead of a project'),
  worktree: z.boolean().optional().describe('Start in a new git worktree on a new branch'),
  model: z.string().optional(),
  effort: z.enum(efforts).optional(),
})

type Input = z.output<typeof input>

const folder = async (pcs: Pcs, pc: Pc, { project, cwd }: Input, own: string | null) => {
  if (project && cwd) throw new Error('Give project or cwd, not both')
  if (cwd) return cwd
  const chosen = project ?? own
  return chosen ? projectCopy(await pcs.project(chosen), pc).path : undefined
}

export const startTool = (pcs: Pcs): Tool<typeof input> => ({
  name: 'thread_start',
  group: 'threads',
  description:
    "Start a new thread on this PC or a paired one. It shows in the sidebar like any thread and its first turn starts right away; this doesn't wait for it. Returns the thread id and PC.",
  input,
  async run(request, { session }) {
    const pc = await pcs.find(request.pc)
    const cwd = await folder(pcs, pc, request, session.project)
    const creator = await pcs.link(session)
    const settings = { ...(request.model && { model: request.model }), ...(request.effort && { effort: request.effort }) }
    const options = { id: Bun.randomUUIDv7(), creator, settings, ...(cwd && { cwd }) }
    const created = await pcs.call<SessionInfo>({ type: 'sessions.create', options }, pc.id)
    if (request.worktree)
      await pcs.call({ type: 'worktrees.intend', session: created.id, intent: { mode: 'new' } }, pc.id).catch(async error => {
        await pcs.call({ type: 'sessions.remove', session: created.id }, pc.id)
        throw error
      })
    await pcs.call({ type: 'queue.add', session: created.id, prompt: request.prompt, from: creator }, pc.id)
    pcs.remember(created.id, pc)
    const where = request.worktree ? `a new worktree of ${created.cwd}` : created.cwd
    return `Started thread ${created.id} on ${pc.name} in ${where}. Its first turn is running; check on it with thread_read.`
  },
})
