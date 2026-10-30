import { pairCancel, pairJoined, pairLink, type ShareLink } from '@sand/devices-contract'
import type { Daemon } from '@sand/host-daemon/contract'
import { plural } from '@sand/util'
import { routeName } from './describe'
import { heardEvents } from './events'
import { withLink } from './link'
import { terminalQr } from './qr'

const minutesLeft = (expires: number) => plural(Math.max(1, Math.round((expires - Date.now()) / 60_000)), 'minute')

const otherLine = (link: ShareLink) => `  ${link.url}  (${routeName(link.route.kind)})`

export const addDevice = (daemon: Daemon) =>
  withLink(daemon, async link => {
    const joined = heardEvents(link, pairJoined)
    const grant = await link.call(pairLink, { kind: 'device' })
    const [best, ...others] = grant.links
    if (!best) {
      await link.call(pairCancel, { token: grant.token })
      throw new Error("sand only listens on this computer, so phones can't reach it; run `sand devices network on` first")
    }
    console.log(
      [
        'scan this with your phone, or open the link on the phone or browser you want to pair:',
        '',
        terminalQr(best.url),
        '',
        `  ${best.url}`,
        ...others.map(otherLine),
        `  works once and expires in ${minutesLeft(grant.expires)}; anyone with it can use this sand`,
        '',
        'waiting for it to open… (Ctrl+C stops waiting; the link keeps working)',
      ].join('\n'),
    )
    const paired = await joined(event => event.token === grant.token, grant.expires)
    console.log(paired ? `paired ${paired.device.name}` : 'the link expired; run `sand devices add` for a new one')
  })
