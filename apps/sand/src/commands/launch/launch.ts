import { createInvite } from '@sand/kit'
import { isAlive, readInfo, running, waitForRuntime } from '../../daemon/info'
import { start } from '../../daemon/start'
import { openBrowser } from './browser'
import { latestSession } from './latest'

export interface LaunchOptions {
  home: string
  latest?: boolean
  session?: string
}

const pageUrl = (base: string, params: Record<string, string | undefined>, secret: string) => {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value)
  url.hash = `pair=${encodeURIComponent(secret)}`
  return url.href
}

const refuseOlder = async (home: string) => {
  const info = await readInfo(home)
  if (info && !info.key && isAlive(info.pid)) throw new Error('an older sand is running; run `sand stop` first')
}

export const launch = async ({ home, latest, session }: LaunchOptions) => {
  const found = await running(home)
  if (!found) await refuseOlder(home)
  const info = found ?? (await start(home))
  await waitForRuntime(info, home)
  const target = session ?? (latest ? await latestSession(info) : undefined)
  if (latest && !target) console.log('no earlier thread, opening a new one')
  const invite = await createInvite(info.url, info.key)
  openBrowser(pageUrl(info.url, { session: target }, invite.secret))
  console.log(found ? `sand is running at ${info.url}` : `started sand (pid ${info.pid}) at ${info.url}`)
  console.log('`sand devices` shows a QR code to pair your phone')
}
