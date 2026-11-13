import { pairLink } from '@sand/devices-contract'
import type { Daemon } from '@sand/host-daemon/contract'
import { openBrowser } from './browser'
import { pageUrl } from './page-url'

const startPaired = async (daemon: Daemon, safe: boolean) => {
  const { info, started } = await daemon.ensure({ safe })
  const { token } = await daemon.request(pairLink, { kind: 'device' })
  console.log(started ? `started sand (pid ${info.pid}) at ${info.url}` : `sand is running at ${info.url}`)
  if (safe) console.log('safe mode: only built-in plugins run; leave it from the banner in the page')
  return pageUrl(info.url, token)
}

const launch = async (daemon: Daemon, safe: boolean) => {
  openBrowser(await startPaired(daemon, safe))
  console.log('`sand devices add` shows a QR code to pair your phone')
}

const serve = async (daemon: Daemon, safe: boolean) => {
  console.log(`open it paired: ${await startPaired(daemon, safe)}`)
}

export { launch, serve }
