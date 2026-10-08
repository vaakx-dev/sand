import { pageLink } from '@sand/kit'
import type { Server } from 'bun'
import { writeInfo } from '../http/token'
import { addresses } from './addresses'
import { createNetwork } from './network'

export interface SharingOptions {
  home: string
  token: string
  hostname: string
  port: number
  listen(hostname: string, port: number): Server<unknown>
}

export const createSharing = ({ home, token, hostname, port, listen }: SharingOptions) => {
  const network = createNetwork(hostname, port, address => listen(address, port))
  let urls = addresses(hostname, port)
  const url = urls[0]!
  const save = () => writeInfo(home, { url, urls, token, pid: process.pid })

  const share = async () => {
    const added = network.share()
    if (!added.length) return urls
    urls = [...urls, ...added]
    await save()
    console.log(['sand is now also serving at', ...added.map(base => `  ${pageLink(base, token)}`)].join('\n'))
    return urls
  }

  return { url, urls: () => urls, save, share, stop: network.stop }
}
