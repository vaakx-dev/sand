import { composer } from '@sand/composer/contract'
import { type GitBranch, gitBranches, type GitPlace } from '@sand/git/contract'
import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { WorkspaceContext } from '../inject'
import type { DraftModel } from './model'

const limit = 50

const fullName = (branch: GitBranch) => (branch.remote ? `${branch.remote}/${branch.name}` : branch.name)

const tags = (branch: GitBranch) =>
  [branch.current && 'current', branch.isDefault && 'default', branch.remote && 'remote', branch.worktree && 'in a worktree'].filter(Boolean).join(' · ')

const branchItem = (ctx: WorkspaceContext, model: DraftModel, branch: GitBranch): PaletteItem => ({
  id: `git-workspace-branch:${fullName(branch)}`,
  icon: 'branch',
  label: fullName(branch),
  meta: tags(branch) || undefined,
  run: () => {
    model.choose({ kind: 'new', from: fullName(branch) })
    ctx.get(composer)?.focus()
  },
})

export const branchPage = (ctx: WorkspaceContext, model: DraftModel, place: GitPlace): PalettePage => ({
  id: 'git-workspace-branches',
  title: 'New worktree from a branch',
  placeholder: 'Find a branch…',
  empty: query => (query.trim() ? 'No branches match.' : 'No branches yet.'),
  filter: false,
  delay: 120,
  async items(query) {
    const wanted = query.trim()
    const { branches } = await ctx.wire.call(gitBranches, { cwd: place.cwd, query: wanted || undefined, limit }, place.device)
    return branches.map(branch => branchItem(ctx, model, branch))
  },
})
