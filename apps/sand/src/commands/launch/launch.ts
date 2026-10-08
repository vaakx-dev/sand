import { running } from '../../daemon/info'
import { start } from '../../daemon/start'
import { shareOnLan, showDevices } from '../devices/devices'
import { openBrowser } from './browser'
import { latestSession } from './latest'

export interface LaunchOptions {
  home: string
  cwd: string
  latest?: boolean
  session?: string
  lan?: boolean
}

const pageUrl = (base: string, params: Record<string, string | undefined>) => {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value)
  return url.href
}

export const launch = async ({ home, cwd, latest, session, lan }: LaunchOptions) => {
  const found = await running(home)
  const started = found ?? (await start(home, cwd, lan))
  const info = found && lan ? await shareOnLan(found) : started
  const target = session ?? (latest ? await latestSession(info, cwd) : undefined)
  if (latest && !target) console.log('no earlier thread in this folder, opening a new one')
  const url = pageUrl(info.url, { token: info.token, cwd, session: target })
  openBrowser(url)
  console.log(found ? `sand is running at ${url}` : `started sand (pid ${info.pid}) at ${url}`)
  const others = info.urls.filter(other => other !== info.url)
  if (lan) await showDevices(info)
  else if (others.length) console.log(['other devices (`sand devices` shows a QR code):', ...others.map(other => `  ${pageUrl(other, { token: info.token })}`)].join('\n'))
}
