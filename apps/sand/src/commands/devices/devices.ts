import type { Pairing, ServerInfo } from '@sand/protocol'
import { pageLink } from '@sand/kit'
import { ask } from '../../daemon/ask'
import { requireRunning } from '../../daemon/info'
import { terminalQr } from './qr'

const local = (url: string) => /^http:\/\/(127\.|localhost|\[::1\])/.test(url)

const qrPairUrl = (base: string, code: string) => `${base.toUpperCase()}/P/${code}`

export const shareOnLan = async (info: ServerInfo): Promise<ServerInfo> => ({ ...info, urls: await ask<string[]>(info, { type: 'server.lan' }) })

export const showDevices = async (info: ServerInfo) => {
  const [first, ...others] = info.urls.filter(url => !local(url))
  if (!first) return console.log('sand only listens on this computer; run `sand devices --lan` so your phone can reach it')
  const { code } = await ask<Pairing>(info, { type: 'server.pair' })
  console.log(
    [
      'scan with your phone (anyone with the link can use this sand):',
      '',
      terminalQr(qrPairUrl(first, code)),
      '',
      `  ${first}/p/${code}  (works once, expires in 10 minutes)`,
      `  ${pageLink(first, info.token)}`,
    ].join('\n'),
  )
  if (others.length) console.log(['', 'other addresses:', ...others.map(other => `  ${pageLink(other, info.token)}`)].join('\n'))
}

export const devices = async (home: string, lan?: boolean) => {
  const info = await requireRunning(home, 'start it with `sand` first, or `sand --lan` to share it straight away')
  await showDevices(lan ? await shareOnLan(info) : info)
}
