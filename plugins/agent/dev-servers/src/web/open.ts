import type { Wire } from '@sand/devices-contract'
import { devServerOpen } from '../contract'
import type { Shown } from './card'

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

const hostnameOf = (link: string) => new URL(link).hostname

const linkFor = (links: string[], reached: string) => {
  if (LOOPBACK.has(reached)) return links.find(link => LOOPBACK.has(hostnameOf(link)))
  return links.find(link => hostnameOf(link) === reached) ?? links.find(link => !LOOPBACK.has(hostnameOf(link)))
}

const blankTab = () => {
  const tab = window.open('', '_blank')
  if (tab) tab.opener = null
  return tab
}

const show = (tab: Window | null, link: string) => {
  if (tab) tab.location.replace(link)
  else window.open(link, '_blank', 'noopener')
}

export const openServer = async (wire: Wire, server: Shown) => {
  const tab = blankTab()
  try {
    const links = await wire.call(devServerOpen, { port: server.port, session: server.session }, server.device)
    const link = linkFor(links, hostnameOf(wire.url('/', server.device)))
    if (!link) throw new Error("sand on that PC doesn't listen on an address this device reaches")
    show(tab, link)
  } catch (error) {
    tab?.close()
    throw error
  }
}
