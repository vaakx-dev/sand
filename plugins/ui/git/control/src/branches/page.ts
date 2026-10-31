import type { GitBranch, GitPlace } from '@sand/git/contract'
import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import { repoOf } from '../next/facts'
import type { ControlParts } from '../parts'

const limit = 50

const tags = (branch: GitBranch) =>
  [branch.current && 'current', branch.isDefault && 'default', branch.remote && 'remote', branch.worktree && !branch.current && 'worktree']
    .filter(Boolean)
    .join(' · ')

const fullName = (branch: GitBranch) => (branch.remote ? `${branch.remote}/${branch.name}` : branch.name)

const branchItem = ({ actions }: ControlParts, branch: GitBranch, waiting: string | undefined): PaletteItem => {
  const elsewhere = branch.worktree && !branch.current ? `Checked out in ${branch.worktree}` : undefined
  return {
    id: `git-branch:${fullName(branch)}`,
    icon: branch.worktree ? 'worktree' : 'branch',
    label: fullName(branch),
    meta: tags(branch) || undefined,
    detail: branch.current ? undefined : (elsewhere ?? waiting),
    disabled: !branch.current && Boolean(elsewhere ?? waiting),
    run: branch.current ? () => undefined : () => void actions.switchTo(branch.name, false),
  }
}

const createItem = ({ actions, model }: ControlParts, name: string, waiting: string | undefined): PaletteItem => {
  const from = repoOf(model.status.get())?.branch
  return {
    id: 'git-branch:create',
    icon: 'plus',
    label: `Create branch '${name}'`,
    detail: waiting ?? (from ? `From ${from}` : undefined),
    disabled: Boolean(waiting),
    run: () => void actions.switchTo(name, true),
  }
}

export const branchPage = (parts: ControlParts, place: GitPlace): PalettePage => ({
  id: 'git-branches',
  title: 'Switch branch',
  placeholder: 'Find or create a branch…',
  empty: query => (query.trim() ? 'No branches match.' : 'No branches yet.'),
  filter: false,
  delay: 120,
  async items(query) {
    const wanted = query.trim()
    const { branches } = await parts.ctx.gitStatus.branches(place, wanted || undefined, limit)
    const waiting = parts.waiting.get()
    const ordered = [...branches.filter(branch => branch.current), ...branches.filter(branch => !branch.current)]
    const rows = ordered.map(branch => branchItem(parts, branch, waiting))
    const taken = branches.some(branch => branch.name === wanted)
    return wanted && !taken ? [...rows, createItem(parts, wanted, waiting)] : rows
  },
})
