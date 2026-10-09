import type { ServerInfo } from '@sand/protocol'
import { createInvite, routeKind } from '@sand/kit'
import { terminalQr } from './qr'

export const printPairing = async (info: ServerInfo) => {
  const invite = await createInvite(info.url, info.key)
  const link = invite.links.find(candidate => routeKind(candidate) !== 'local')
  if (!link) return console.log('sand is not listening on the network, so phones cannot reach it; run `sand devices lan on`')
  console.log(
    [
      'scan with your phone to pair it (anyone with the link can use this sand):',
      '',
      terminalQr(link),
      '',
      `  ${link}`,
      '  (works once, expires in 10 minutes)',
    ].join('\n'),
  )
}
