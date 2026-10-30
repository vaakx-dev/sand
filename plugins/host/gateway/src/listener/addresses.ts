import { networkInterfaces } from 'node:os'
import { type Ip, parseIp } from './ip'

const virtual = /^(docker|br-|veth|virbr|cni|flannel|vmnet|vboxnet)/
const windowsVirtual = /^(vEthernet \((WSL|Default Switch)|VirtualBox|VMware|Hyper-V|Npcap|Bluetooth)/i
const subnetLife = 30_000

const isVirtual = (name: string) => virtual.test(name) || (process.platform === 'win32' && windowsVirtual.test(name))

export const loopbackAddress = '127.0.0.1'

const interfaceEntries = () =>
  Object.entries(networkInterfaces())
    .filter(([name]) => !isVirtual(name))
    .flatMap(([, entries]) => entries ?? [])
    .filter(entry => !entry.internal)

const isLinkLocal = (address: string) => /^(169\.254\.|fe[89ab][0-9a-f]:)/i.test(address)

export const networkAddresses = (ipv6: boolean) =>
  interfaceEntries()
    .filter(entry => (entry.family === 'IPv4' || ipv6) && !isLinkLocal(entry.address))
    .map(entry => entry.address)

export interface Subnet {
  ip: Ip
  prefix: number
}

const readSubnets = (): Subnet[] =>
  interfaceEntries().flatMap(entry => {
    const ip = entry.family === 'IPv6' ? parseIp(entry.address) : undefined
    const prefix = Number(entry.cidr?.split('/')[1])
    return ip && Number.isInteger(prefix) && prefix > 0 ? [{ ip, prefix }] : []
  })

let cached: { subnets: Subnet[]; at: number } | undefined

export const ipv6Subnets = () => {
  if (!cached || Date.now() - cached.at > subnetLife) cached = { subnets: readSubnets(), at: Date.now() }
  return cached.subnets
}

export const urlFor = (address: string, port: number) => `http://${address.includes(':') ? `[${address}]` : address}:${port}`
