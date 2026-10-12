import type { FoundThread, Pcs } from '@sand/pc-link/contract'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Later } from './later'
import { checkPcMove, moveToPc } from './pc'
import { checkWorktreeMove, moveToWorktree } from './worktree'

const input = z.object({
  thread: z.string().optional().describe('Thread id or name. Defaults to this thread'),
  pc: z.string().optional().describe("The thread's PC, by name or id. Found by itself when left out"),
  to: z.string().optional().describe('PC name or id to move the thread to'),
  branch: z.string().optional().describe('Instead of to: move the thread into a new git worktree on this new branch, on the same PC'),
  base: z.string().optional().describe('With branch: the branch or commit the worktree starts from. Defaults to the current branch'),
  cwd: z.string().optional().describe("With to: the folder on that PC, when the thread isn't in a project that PC has"),
  send_changes: z.boolean().optional().describe("With to: send the project's changes the other PC doesn't have before moving (true) or move without them (false)"),
})

type Input = z.output<typeof input>

const planned = async (pcs: Pcs, found: FoundThread, request: Input) => {
  if (Boolean(request.to) === Boolean(request.branch)) throw new Error('Give to or branch')
  if (request.branch) {
    const move = { branch: request.branch, base: request.base }
    await checkWorktreeMove(pcs, found, move)
    return { run: () => moveToWorktree(pcs, found, move), next: 'The next turn runs in the new worktree.' }
  }
  const move = { to: await pcs.find(request.to), cwd: request.cwd, sendChanges: request.send_changes }
  await checkPcMove(pcs, found, move)
  return { run: () => moveToPc(pcs, found, move), next: `The new thread on ${move.to.name} waits for a message; this thread stays here with a link to it.` }
}

export const moveTool = (pcs: Pcs, later: Later): Tool<typeof input> => ({
  name: 'thread_move',
  group: 'threads',
  description:
    'Move a thread to another PC, where it continues as a new thread, or into a new git worktree on a new branch. Moving this thread happens once the current turn ends, and its next turn waits for the move.',
  input,
  async run(request, { session }) {
    const found = await pcs.threadOrOwn(session, request.thread, request.pc)
    const own = found.pc.here && found.thread.id === session.id
    const move = await planned(pcs, found, request)
    if (!own) return move.run()
    later(session, move.run)
    return `This thread moves when this turn ends. ${move.next} Finish what you are doing now and end the turn.`
  },
})
