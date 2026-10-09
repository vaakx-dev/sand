import { networkInterfaces } from 'node:os'

const wildcard = new Set(['0.0.0.0', '::', ''])
const virtual = /^(docker|br-|veth|virbr|cni|flannel|vmnet|vboxnet)/

const windowsVirtual = /^(vEthernet \((WSL|Default Switch)|VirtualBox|VMware|Hyper-V|Npcap|Bluetooth)/i

const host = (address: string) => (address.includes(':') ? `[${address}]` : address)

const isWildcard = (hostname: string) => wildcard.has(hostname)

const isVirtual = (name: string) => virtual.test(name) || (process.platform === 'win32' && windowsVirtual.test(name))

const lanAddresses = () =>
  Object.entries(networkInterfaces())
    .filter(([name]) => !isVirtual(name))
    .flatMap(([, entries]) => entries ?? [])
    .filter(entry => entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.'))
    .map(entry => entry.address)

const loopbackHosts = new Set(['127.0.0.1', '[::1]', 'localhost'])

export const isLoopbackUrl = (url: string) => loopbackHosts.has(new URL(url).hostname)

const urlFor = (address: string, port: number) => `http://${host(address)}:${port}`

export const addresses = (hostname: string, port: number) => {
  const hosts = isWildcard(hostname) ? ['127.0.0.1', ...lanAddresses()] : [hostname]
  return hosts.map(address => urlFor(address, port))
}
