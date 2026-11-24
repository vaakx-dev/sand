import { settings } from '@sand/settings/contract'
import { div } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'
import { agentsSection } from './agents/section'
import { pcsSection } from './pcs/section'
import { phonesSection } from './phones/section'
import { requestsSection } from './requests'
import { thisPcSections } from './this-pc'

const devicesPage = (ui: Ui) => {
  ui.data.refresh()
  return div({ class: 'flex flex-col gap-6' }, requestsSection(ui), pcsSection(ui), phonesSection(ui), agentsSection(ui), ...thisPcSections(ui))
}

const items = [
  { id: 'pcs', label: 'PCs', keywords: ['computer', 'laptop', 'add a PC', 'install'] },
  { id: 'phones', label: 'Phones and browsers', keywords: ['pair phone', 'add a phone', 'mobile', 'QR code', 'browser'] },
  { id: 'agents', label: 'Agents', keywords: ['add an agent', 'outside agent', 'external agent'] },
  { id: 'tailscale', label: 'Tailscale', keywords: ['reach from anywhere', 'remote access', 'HTTPS', 'address for phones'] },
  { id: 'network', label: 'Open to your network', keywords: ['LAN', 'wifi', 'local network'] },
]

export const devicesSettings = (ui: Ui) =>
  ui.ctx.watch(settings, found => found?.page({ id: 'devices', label: 'Devices', icon: 'laptop', group: 'accounts', order: 27, items, dot: () => ui.data.requests.live(Date.now()).length > 0, render: () => devicesPage(ui) }))
