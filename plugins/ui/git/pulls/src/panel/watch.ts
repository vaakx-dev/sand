import { div, span } from '@vaakx-dev/vrui'
import type { Shown } from './shown'

const watchText = (on: boolean) =>
  on ? 'Watching: the agent wakes when checks finish or a review arrives' : 'Not watching. Turn on to wake the agent when checks finish or a review arrives'

export const watchRow = ({ parts, link, at, state }: Shown) =>
  div(
    { class: 'flex items-center gap-2' },
    parts.kit.toggleSwitch({
      on: link.watching,
      title: link.watching ? 'Stop watching' : 'Watch this pull request',
      'aria-label': 'Watch this pull request',
      disabled: state.busy,
      onClick: () => void state.run(() => parts.actions.watch(link, at, !link.watching)),
    }),
    span({ class: 'text-xs text-neutral-400' }, watchText(link.watching)),
  )
