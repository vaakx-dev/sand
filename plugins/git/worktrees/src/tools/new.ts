import type { Tool } from '@sand/tools/contract'
import type { Turns } from '@sand/turns-contract/contract'
import { z } from 'zod'
import { threadIn } from '../create/thread'
import type { WorktreeDeps } from '../deps'
import { checkMovable, type Moves } from './move'

const input = z.object({
  task: z.string().optional().describe('What to do in the worktree. Needed for a new thread; after a move, this thread carries on with it'),
  move: z.boolean().optional().describe('Move this thread into the new worktree, with the uncommitted changes, instead of starting a new thread. Happens when this turn ends'),
  branch: z.string().optional().describe('New thread: an existing local branch to check out. Move: a name for the new branch. Default: named from the task'),
  from: z.string().optional().describe('New thread only: the branch or commit to start from (default: the default branch)'),
})

export const newTool = (deps: WorktreeDeps, moves: Moves, turns: () => Turns | undefined): Tool<typeof input> => ({
  name: 'worktree_new',
  description: [
    'Start a new thread in its own git worktree and branch to work on a task in parallel, or move this thread into one.',
    'Use this instead of git worktree add: it also sets the worktree up and names its branch.',
  ].join(' '),
  input,
  needs: ['thread', 'pc'],
  async run({ task, move, branch, from }, { cwd, conversation }) {
    if (move) {
      await checkMovable(deps, deps.sessions.require(conversation.id))
      moves.queue(conversation.id, { ...(branch ? { branch } : {}), ...(task ? { task } : {}) })
      return [
        'This thread moves into a new worktree when this turn ends, taking the uncommitted changes with it.',
        task ? 'It then carries on with the task there.' : 'The next turn runs there.',
        'End your turn now without editing more files.',
      ].join(' ')
    }
    if (!task) throw new Error('Give the new thread a task.')
    const running = turns()
    if (!running) throw new Error("Can't start a thread right now.")
    const thread = await threadIn(deps, { cwd, ...(branch ? { branch } : {}), ...(from ? { from } : {}) })
    running.run(deps.sessions.require(thread.id), task, { origin: 'agent' }).catch(deps.report)
    return `Started thread ${thread.id} in the worktree ${thread.cwd}. It works on the task on its own.`
  },
})
