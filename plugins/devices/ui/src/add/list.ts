import type { DeviceRecord } from '@sand/devices-contract'
import type { IconName } from '@sand/ui-kit/contract'
import { div, type Sig } from '@vaakx-dev/vrui'
import type { AddStep, Ui } from '../ui'
import { askingSection } from './asking'
import { foundSection } from './found'

const moreRow = (ui: Ui, glyph: IconName, title: string, go: () => void) => {
  const { chevron, icon, listRow } = ui.kit
  return listRow({ surface: 'group', lead: icon(glyph, 'md'), title, trail: chevron(() => false), onClick: go })
}

export const listStep = (ui: Ui, joined: Sig<DeviceRecord[]>, go: (step: AddStep) => void) =>
  div(
    { class: 'flex flex-col gap-6' },
    askingSection(ui, joined),
    foundSection(ui, () => go('link')),
    ui.kit.settingsSection(
      { title: 'More ways' },
      moreRow(ui, 'qr', 'Show a QR for a phone or browser', () => go('phone')),
      moreRow(ui, 'term', 'Install sand on a new PC', () => go('install')),
    ),
  )
