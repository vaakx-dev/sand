import type { Tool } from '@sand/tools/contract'
import { bytes } from '@sand/util'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { WorktreeDeps } from '../deps'
import { removeWorktree } from '../remove/remove'
import type { Survey } from '../status/survey'

const input = z.object({
  path: z.string().describe('The worktree folder, as worktree_list shows it'),
  force: z
    .boolean()
    .optional()
    .describe('Remove it even with uncommitted or unpushed work, which sand sets aside; only when the user said so'),
})

export const removeTool = (deps: WorktreeDeps, survey: Survey): Tool<typeof input> => ({
  name: 'worktree_remove',
  description:
    'Remove a worktree sand made and its branch to free disk space; the user can restore it. Refuses when a thread works there or work would be lost, unless forced. Use it instead of git worktree remove.',
  input,
  needs: ['pc'],
  async run({ path, force }, { cwd }) {
    const folder = resolve(cwd, path)
    const size = survey.known(folder)
    const result = await removeWorktree(deps, { path: folder, force })
    if (result.removed) return `Removed ${folder}${size === undefined ? '' : `, freeing ${bytes(size)}`}.`
    if (result.check.running) return `Kept ${folder}. ${result.message}`
    return `Kept ${folder}. ${result.message} Commit and push that work first, or pass force: true if the user agreed.`
  },
})
