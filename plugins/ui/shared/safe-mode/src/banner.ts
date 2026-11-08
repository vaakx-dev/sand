import type { Kit } from '@sand/ui-kit/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { SafeSource } from './source'

export const bannerView = ({ callout, secondaryAction }: Kit, source: SafeSource) =>
  div(
    { role: 'status', class: 'w-full px-3 pt-2' },
    callout(
      { tone: 'neutral', icon: 'shield' },
      span({ class: 'min-w-0 flex-1' }, 'Safe mode is on, so only built-in plugins are running. Leave it to load your own plugins again.'),
      secondaryAction({ size: 'sm', disabled: source.busy, onClick: () => void source.leave() }, 'Leave safe mode'),
    ),
  )
