import { type GitStatus, repoOf } from '@sand/git/contract'
import { plural, shortSha } from '@sand/util'
import { derive, dynamicChild, show, span } from '@vaakx-dev/vrui'
import { isDiverged } from '../next/facts'
import type { ControlParts } from '../parts'

type ChipKind = 'repo' | 'none' | 'loading'

const kindOf = (status: GitStatus | undefined): ChipKind => (!status ? 'loading' : status.local.repo ? 'repo' : 'none')

const branchName = (status: GitStatus | undefined) => {
  const local = repoOf(status)
  if (!local) return ''
  if (local.detached) return local.head ? shortSha(local.head) : 'Detached'
  return local.branch ?? 'No branch'
}

const statusWord = (status: GitStatus | undefined) => {
  if (repoOf(status)?.detached) return 'detached'
  return isDiverged(status?.remote) ? 'diverged' : ''
}

const changedText = (status: GitStatus | undefined) => {
  const local = repoOf(status)
  if (!local?.fileCount) return ''
  return `${plural(local.fileCount, 'file')} changed, +${local.add} −${local.del}`
}

const chipTitle = (status: GitStatus | undefined) =>
  [branchName(status), statusWord(status), changedText(status), 'Switch branch'].filter(Boolean).join(' · ')

const repoChip = (parts: ControlParts) => {
  const { kit, model, openBranches } = parts
  const { icon, navButton } = kit
  const glyph = model.status.map(status => (repoOf(status)?.worktree ? 'worktree' : 'branch'))
  const word = derive(() => {
    const text = statusWord(model.status.get())
    return text === 'diverged' && parts.next.get()?.base === 'rebase' ? '' : text
  })
  const title = () => chipTitle(model.status.get())
  return navButton(
    { title, 'aria-label': title, onClick: openBranches },
    dynamicChild(glyph, value => icon(value, 16)),
    span({ class: 'min-w-0 max-w-40 truncate' }, () => branchName(model.status.get())),
    show(
      () => Boolean(word.get()),
      () => span({ class: 'shrink-0 text-xs text-warning-400' }, word),
    ),
  )
}

const initChip = ({ kit, actions }: ControlParts) => {
  const { dropdown, icon, menuItem, navButton } = kit
  return dropdown({
    placement: 'below-right',
    class: 'shrink-0',
    trigger: (press, open) =>
      navButton(
        { active: open, title: 'Not a git repo', 'aria-label': 'Not a git repo', ...press },
        icon('branch', 16),
        span({ class: 'hidden md:block' }, 'Not a git repo'),
        span({ class: 'hidden text-neutral-500 md:inline-flex' }, icon('down', 14)),
      ),
    items: close => [
      menuItem(
        {
          icon: 'plus',
          onClick: () => {
            close()
            void actions.init()
          },
        },
        'Start a git repo',
      ),
    ],
  })
}

export const branchChip = (parts: ControlParts) =>
  dynamicChild(parts.model.status.map(kindOf), kind => {
    if (kind === 'repo') return repoChip(parts)
    return kind === 'none' ? initChip(parts) : null
  })
