import type { Daemon } from '@sand/protocol'
import type { SessionSummary } from '@sand/sessions-sqlite/contract'
import { createInvite } from '@sand/kit'
import { openBrowser } from './browser'

interface LaunchOptions {
  latest?: boolean
  session?: string
  safe?: boolean
}

const latestSession = async (daemon: Daemon) =>
  (await daemon.request<SessionSummary[]>({ type: 'sessions.list' }, { timeout: 5000 })).find(session => session.kind !== 'agent')?.id

const pageUrl = (base: string, session: string | undefined, secret: string) => {
  const url = new URL(base)
  if (session) url.searchParams.set('session', session)
  url.hash = `pair=${encodeURIComponent(secret)}`
  return url.href
}

export const launch = async (daemon: Daemon, { latest, session, safe = false }: LaunchOptions) => {
  const { info, started } = await daemon.ensure({ safe })
  const target = session ?? (latest ? await latestSession(daemon) : undefined)
  if (latest && !target) console.log('no earlier thread, opening a new one')
  const invite = await createInvite(info.url, info.key)
  openBrowser(pageUrl(info.url, target, invite.secret))
  console.log(started ? `started sand (pid ${info.pid}) at ${info.url}` : `sand is running at ${info.url}`)
  if (safe) console.log('safe mode: only built-in plugins run; leave it from the banner in the page')
  console.log('`sand devices` shows a QR code to pair your phone')
}
