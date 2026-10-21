import type { Daemon } from '@sand/host-daemon/contract'
import { createInvite } from '@sand/host-remotes/pairing'
import { openBrowser } from './browser'

const pageUrl = (base: string, secret: string) => {
  const url = new URL(base)
  url.hash = `pair=${encodeURIComponent(secret)}`
  return url.href
}

export const launch = async (daemon: Daemon, safe: boolean) => {
  const { info, started } = await daemon.ensure({ safe })
  const invite = await createInvite(info.url, info.key)
  openBrowser(pageUrl(info.url, invite.secret))
  console.log(started ? `started sand (pid ${info.pid}) at ${info.url}` : `sand is running at ${info.url}`)
  if (safe) console.log('safe mode: only built-in plugins run; leave it from the banner in the page')
  console.log('`sand devices` shows a QR code to pair your phone')
}
