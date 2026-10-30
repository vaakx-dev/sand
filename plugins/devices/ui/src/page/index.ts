import { settings } from '@sand/settings/contract'
import { div } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'
import { pcsSection } from './pcs/section'
import { phonesSection } from './phones/section'
import { requestsSection } from './requests'
import { thisPcSections } from './this-pc'

const devicesPage = (ui: Ui) => {
  ui.data.refresh()
  return div({ class: 'flex flex-col gap-6' }, requestsSection(ui), pcsSection(ui), phonesSection(ui), ...thisPcSections(ui))
}

export const devicesSettings = (ui: Ui) =>
  ui.ctx.watch(settings, found => found?.page({ id: 'devices', label: 'Devices', icon: 'laptop', order: 27, dot: () => ui.data.requests.live(Date.now()).length > 0, render: () => devicesPage(ui) }))
