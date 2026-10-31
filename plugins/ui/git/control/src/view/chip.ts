import { type GitStatus, repoOf } from '@sand/git/contract'
import { shortSha } from '@sand/util'
import { dynamicChild, show, span } from '@vaakx-dev/vrui'
import type { ControlParts } from '../parts'

type ChipKind = 'repo' | 'none' | 'loading'

const kindOf = (status: GitStatus | undefined): ChipKind => (!status ? 'loading' : status.local.repo ? 'repo' : 'none')

const branchName = (status: GitStatus | undefined) => {
  const local = repoOf(status)
  if (!local) return ''
  if (local.detached) return local.head ? shortSha(local.head) : 'Detached'
  return local.branch ?? 'No branch'
}

const chipChevron = ({ kit }: ControlParts) => span({ class: 'hidden text-neutral-500 md:inline-flex' }, kit.icon('down', 14))

const repoChip = (parts: ControlParts) => {
  const { kit, model, openBranches } = parts
  const { icon, lineStat, navButton } = kit
  const name = model.status.map(branchName)
  const glyph = model.status.map(status => (repoOf(status)?.worktree ? 'worktree' : 'branch'))
  const add = model.status.map(status => repoOf(status)?.add ?? 0)
  const del = model.status.map(status => repoOf(status)?.del ?? 0)
  const title = () => `${name.get()} · switch branch`
  return navButton(
    { title, 'aria-label': title, class: 'shrink-0', onClick: openBranches },
    dynamicChild(glyph, value => icon(value, 16)),
    span({ class: 'hidden max-w-48 truncate font-mono text-neutral-100 md:block' }, name),
    show(
      () => add.get() + del.get() > 0,
      () => span({ class: 'hidden md:flex' }, lineStat(add, del)),
    ),
    chipChevron(parts),
  )
}

const initChip = (parts: ControlParts) => {
  const { kit, actions } = parts
  const { dropdown, icon, menuItem, navButton } = kit
  return dropdown({
    placement: 'below-right',
    class: 'shrink-0',
    trigger: (press, open) =>
      navButton(
        { active: open, title: 'Not a git repo', 'aria-label': 'Not a git repo', ...press },
        icon('branch', 16),
        span({ class: 'hidden md:block' }, 'Not a git repo'),
        chipChevron(parts),
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
