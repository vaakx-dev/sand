import { div, pageHead, secondaryAction } from '@sand/dom'
import type { Fleet } from '../fleet/model'
import { channelSection } from './channel'
import { latestSection } from './latest'
import { pcsSection } from './pcs'

export const updatesPage = (fleet: Fleet, open: () => void): HTMLElement =>
  div(
    { class: 'flex flex-col gap-6' },
    pageHead(
      'Sand looks for new versions on GitHub and installs one only when you click Update.',
      secondaryAction({ size: 'sm', disabled: fleet.busy, onClick: () => void fleet.check() }, 'Check now'),
    ),
    latestSection(fleet, open),
    pcsSection(fleet),
    channelSection(fleet),
  )
