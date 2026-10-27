import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { SafeSource } from './source'

export const bannerView = ({ secondaryAction, statusBanner }: Kit, source: SafeSource) =>
  div(
    { class: 'w-full px-3 pt-2' },
    statusBanner(
      {},
      span({ class: 'min-w-0 flex-1' }, 'Safe mode: only built-in plugins are running.'),
      secondaryAction({ size: 'sm', disabled: source.busy, onClick: () => void source.leave() }, 'Leave safe mode'),
    ),
  )
