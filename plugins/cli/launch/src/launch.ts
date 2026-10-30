import { pageLinkKeys, pairLink } from '@sand/devices-contract'
import type { Daemon } from '@sand/host-daemon/contract'
import { openBrowser } from './browser'

const pageUrl = (base: string, token: string) => {
  const url = new URL(base)
  url.hash = `${pageLinkKeys.pair}=${encodeURIComponent(token)}`
  return url.href
}

export const launch = async (daemon: Daemon, safe: boolean) => {
  const { info, started } = await daemon.ensure({ safe })
  const { token } = await daemon.request(pairLink, { kind: 'device' })
  openBrowser(pageUrl(info.url, token))
  console.log(started ? `started sand (pid ${info.pid}) at ${info.url}` : `sand is running at ${info.url}`)
  if (safe) console.log('safe mode: only built-in plugins run; leave it from the banner in the page')
  console.log('`sand devices add` shows a QR code to pair your phone')
}
