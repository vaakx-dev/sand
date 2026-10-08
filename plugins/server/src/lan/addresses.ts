import { networkInterfaces } from 'node:os'

const wildcard = new Set(['0.0.0.0', '::', ''])
const virtual = /^(docker|br-|veth|virbr|cni|flannel|vmnet|vboxnet)/

const host = (address: string) => (address.includes(':') ? `[${address}]` : address)

export const isWildcard = (hostname: string) => wildcard.has(hostname)

export const lanAddresses = () =>
  Object.entries(networkInterfaces())
    .filter(([name]) => !virtual.test(name))
    .flatMap(([, entries]) => entries ?? [])
    .filter(entry => entry.family === 'IPv4' && !entry.internal)
    .map(entry => entry.address)

export const urlFor = (address: string, port: number) => `http://${host(address)}:${port}`

export const addresses = (hostname: string, port: number) => {
  const hosts = isWildcard(hostname) ? ['127.0.0.1', ...lanAddresses()] : [hostname]
  return hosts.map(address => urlFor(address, port))
}
