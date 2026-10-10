import type { MenuSpec, NavAction } from '@sand/dom'
import type { PcRow, PcRowActions } from './pc-row'

export const pcMenu = ({ pc, self, shares }: PcRow, actions: PcRowActions): MenuSpec => {
  const busy = actions.busy()
  const list: (NavAction | false)[] = [
    { id: 'check', label: 'Check again', icon: 'reload', group: 'health', run: actions.check },
    !self && { id: 'repair', label: 'Repair', icon: 'wrench', group: 'health', run: busy ? () => {} : actions.repair },
    !self && pc.pairing !== 'paired' && { id: 'pair-again', label: 'Pair again', icon: 'link', group: 'pair', run: actions.pairAgain },
    !self && {
      id: 'remove',
      label: 'Remove',
      icon: 'trash',
      group: 'remove',
      danger: true,
      confirm: `Removes ${pc.name} from your PCs.`,
      run: actions.remove,
    },
  ]
  return {
    title: pc.name,
    subtitle: self ? 'This PC' : shares.length ? `Shares ${shares.join(', ')}` : undefined,
    actions: list.filter(action => action !== false),
  }
}
