import type { ListedTurn, SnapshotSide } from '@sand/git-snapshots/contract'
import { type Sig, span } from '@vaakx-dev/vrui'
import type { TurnParts } from '../parts'
import { busyReason } from '../restore/busy'
import { restoreTurn } from '../restore/restore'

const sides: SnapshotSide[] = ['before', 'after']

export const turnMenu = (parts: TurnParts, device: string, snapshot: Sig<ListedTurn | undefined>) => {
  const { kit } = parts.ctx
  const { dropdown, icon, iconButton, menuItem, menuReason } = kit
  const restoreItems = (close: () => void) => {
    const found = snapshot.get()
    if (!found) return []
    const reason = parts.threads.read(() => busyReason(parts.ctx, { cwd: found.cwd, device }))
    return sides.map(to =>
      menuItem(
        {
          icon: 'retry',
          disabled: () => Boolean(reason.get()),
          onClick: () => {
            close()
            void restoreTurn(parts, found, to)
          },
        },
        span({ class: 'min-w-0 flex-1 truncate' }, `Restore to ${to} this turn`),
        menuReason(() => reason.get() ?? ''),
      ),
    )
  }
  return dropdown({
    placement: 'below-right',
    trigger: (press, open) =>
      iconButton({ size: 'sm', active: open, title: 'More for this turn', 'aria-label': 'More for this turn', ...press }, icon('more', 16)),
    items: restoreItems,
  })
}
