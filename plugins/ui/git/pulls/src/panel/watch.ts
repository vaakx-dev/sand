import type { Shown } from './shown'

export const watchRow = ({ parts, link, at, state }: Shown) => {
  const { kit } = parts
  return kit.settingsSection(
    {},
    kit.settingsRow(
      { title: 'Wake the agent', detail: 'When checks finish or a review arrives' },
      kit.toggleSwitch({
        on: link.watching,
        title: link.watching ? 'Stop watching this pull request' : 'Watch this pull request',
        'aria-label': 'Wake the agent when checks finish or a review arrives',
        disabled: state.busy,
        onClick: () => void state.run(() => parts.actions.watch(link, at, !link.watching)),
      }),
    ),
  )
}
