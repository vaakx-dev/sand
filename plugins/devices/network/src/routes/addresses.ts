import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os'
import { isLinkLocal, isTailscaleIp } from './hosts'

const virtual = /^(docker|br-|veth|virbr|cni|flannel|vmnet|vboxnet|utun|tailscale|zt)/
const windowsVirtual = /^(vEthernet \((WSL|Default Switch)|VirtualBox|VMware|Hyper-V|Npcap|Bluetooth|Tailscale|ZeroTier)/i

const isVirtual = (name: string) => virtual.test(name) || (process.platform === 'win32' && windowsVirtual.test(name))

const isLan = (entry: NetworkInterfaceInfo) => !entry.internal && !isLinkLocal(entry.address) && !isTailscaleIp(entry.address)

export const lanInterfaces = () =>
  Object.entries(networkInterfaces())
    .filter(([name]) => !isVirtual(name))
    .flatMap(([, entries]) => entries ?? [])
    .filter(isLan)

export const lanAddresses = () => {
  const entries = lanInterfaces()
  const v4 = entries.filter(entry => entry.family === 'IPv4')
  const v6 = entries.filter(entry => entry.family === 'IPv6')
  return [...new Set([...v4, ...v6].map(entry => entry.address))]
}
