import { networkInterfaces } from 'node:os'

const wildcard = new Set(['0.0.0.0', '::', ''])
const virtual = /^(docker|br-|veth|virbr|cni|flannel|vmnet|vboxnet)/
const windowsVirtual = /^(vEthernet \((WSL|Default Switch)|VirtualBox|VMware|Hyper-V|Npcap|Bluetooth)/i

const isVirtual = (name: string) => virtual.test(name) || (process.platform === 'win32' && windowsVirtual.test(name))

const lanAddresses = () =>
  Object.entries(networkInterfaces())
    .filter(([name]) => !isVirtual(name))
    .flatMap(([, entries]) => entries ?? [])
    .filter(entry => entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.'))
    .map(entry => entry.address)

const urlFor = (address: string, port: number) => `http://${address.includes(':') ? `[${address}]` : address}:${port}`

export const addresses = (hostname: string, port: number) => {
  const hosts = wildcard.has(hostname) ? ['127.0.0.1', ...lanAddresses()] : [hostname]
  return hosts.map(address => urlFor(address, port))
}
