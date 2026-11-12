import type { Kit } from '@sand/ui-kit/contract'
import type { SafeSource } from './source'

export const bannerView = ({ banner, secondaryAction }: Kit, source: SafeSource) =>
  banner({
    icon: 'shield',
    title: 'Safe mode is on, so only built-in plugins are running. Leave it to load your own plugins again.',
    actions: [secondaryAction({ size: 'sm', disabled: source.busy, onClick: () => void source.leave() }, 'Leave safe mode')],
  })
