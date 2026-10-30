import { lanInterfaces } from '../../routes/addresses'

const broadcastOf = (address: string, netmask: string) => {
  const parts = address.split('.').map(Number)
  const mask = netmask.split('.').map(Number)
  return parts.map((part, index) => part | (~(mask[index] ?? 255) & 255)).join('.')
}

export const broadcastTargets = () => [
  ...new Set(
    lanInterfaces()
      .filter(entry => entry.family === 'IPv4' && entry.netmask !== '255.255.255.255')
      .map(entry => broadcastOf(entry.address, entry.netmask)),
  ),
]
