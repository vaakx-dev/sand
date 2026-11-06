import type { Tool } from '@sand/tools/contract'
import { bytes } from '@sand/util'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { WorktreeDeps } from '../deps'
import { removeWorktree } from '../remove/remove'
import type { Survey } from '../status/survey'

const input = z.object({
  path: z.string().describe('The worktree folder, as worktree_list shows it'),
  force: z.boolean().optional().describe('Also remove it when it has uncommitted files or unpushed commits, which are then lost. Only when the user said so'),
})

export const removeTool = (deps: WorktreeDeps, survey: Survey): Tool<typeof input> => ({
  name: 'worktree_remove',
  description: [
    'Remove a worktree sand made, with its branch, to free disk space. It refuses when a thread is working there or when work would be lost, unless forced.',
    'Threads in it move back to the main checkout, and the user can restore it later.',
    'Use this instead of git worktree remove.',
  ].join(' '),
  input,
  needs: ['pc'],
  async run({ path, force }, { cwd }) {
    const folder = resolve(cwd, path)
    const size = survey.known(folder)
    const result = await removeWorktree(deps, { path: folder, force })
    if (result.removed) return `Removed ${folder}${size === undefined ? '' : `, freeing ${bytes(size)}`}.`
    if (result.check.running) return `Kept ${folder}. ${result.message}`
    return `Kept ${folder}. ${result.message} Commit and push that work first, or pass force: true if the user agreed to lose it.`
  },
})
