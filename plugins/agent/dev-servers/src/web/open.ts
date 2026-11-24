import type { Pcs, Wire } from '@sand/devices-contract'
import { devServerOpen, devServerRelay } from '../contract'
import type { Shown } from './card'

interface Reach {
  wire: Wire
  pcs: Pcs
}

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

const routeTo = (pcs: Pcs, pc: string) => {
  const status = pcs.get(pc)?.status
  if (status?.phase !== 'connected') throw new Error(`${pcs.name(pc)} isn't connected`)
  return status.route
}

const addressOf = (pcs: Pcs, pc: string) => {
  const { url } = routeTo(pcs, pc)
  if (!url) throw new Error(`${pcs.name(pc)} isn't connected to this page directly`)
  return url
}

const reachableLinks = async ({ wire, pcs }: Reach, server: Shown) => {
  const links = await wire.call(devServerOpen, { port: server.port, session: server.session }, server.device)
  const { url, via } = routeTo(pcs, server.device)
  if (url) return { links, address: url }
  if (!via) throw new Error(`${pcs.name(server.device)} has no route this page can link to`)
  return { links: await wire.call(devServerRelay, { pc: server.device, links }, via), address: addressOf(pcs, via) }
}

export const openServer = async (reach: Reach, server: Shown) => {
  const tab = blankTab()
  try {
    const { links, address } = await reachableLinks(reach, server)
    const link = linkFor(links, hostnameOf(address))
    if (!link) throw new Error("sand on that PC doesn't listen on an address this device reaches")
    show(tab, link)
  } catch (error) {
    tab?.close()
    throw error
  }
}
