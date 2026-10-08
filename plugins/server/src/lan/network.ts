import type { Server } from 'bun'
import { isWildcard, lanAddresses, urlFor } from './addresses'

export const createNetwork = (hostname: string, port: number, listen: (hostname: string) => Server<unknown>) => {
  const servers = new Map<string, Server<unknown>>()

  const share = () => {
    if (isWildcard(hostname)) return []
    const added = lanAddresses().filter(address => address !== hostname && !servers.has(address))
    if (!added.length && !servers.size) throw new Error('this computer is not on a network')
    for (const address of added) servers.set(address, listen(address))
    return added.map(address => urlFor(address, port))
  }

  const stop = () => {
    for (const server of servers.values()) void server.stop(true)
    servers.clear()
  }

  return { share, stop }
}
