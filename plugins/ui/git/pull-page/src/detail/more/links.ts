import type { Child } from '@vaakx-dev/vrui'
import { notify } from '../../notify'
import type { Shown } from '../shown'

export const linkItems = (shown: Shown, close: () => void): Child[] => {
  const { kit, ctx } = shown.parts
  const url = shown.pull().url
  return [
    kit.menuItem(
      {
        icon: 'external',
        onClick: () => {
          close()
          kit.openTab(url)
        },
      },
      'Open on GitHub',
    ),
    kit.menuItem(
      {
        icon: 'link',
        onClick: () => {
          close()
          void kit.copyText(url).then(() => notify(ctx, { tone: 'success', title: 'Copied the link' }))
        },
      },
      'Copy link',
    ),
  ]
}
