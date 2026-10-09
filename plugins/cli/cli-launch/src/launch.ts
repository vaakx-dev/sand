import type { Daemon } from '@sand/protocol'
import { createInvite } from '@sand/kit'
import { openBrowser } from './browser'
import { latestSession } from './latest'

export interface LaunchOptions {
  latest?: boolean
  session?: string
  safe?: boolean
}

const pageUrl = (base: string, params: Record<string, string | undefined>, secret: string) => {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value)
  url.hash = `pair=${encodeURIComponent(secret)}`
  return url.href
}

export const launch = async (daemon: Daemon, { latest, session, safe = false }: LaunchOptions) => {
  const { info, started } = await daemon.ensure({ safe })
  const target = session ?? (latest ? await latestSession(daemon) : undefined)
  if (latest && !target) console.log('no earlier thread, opening a new one')
  const invite = await createInvite(info.url, info.key)
  openBrowser(pageUrl(info.url, { session: target }, invite.secret))
  console.log(started ? `started sand (pid ${info.pid}) at ${info.url}` : `sand is running at ${info.url}`)
  if (safe) console.log('safe mode: only built-in plugins run; leave it from the banner in the page')
  console.log('`sand devices` shows a QR code to pair your phone')
}
