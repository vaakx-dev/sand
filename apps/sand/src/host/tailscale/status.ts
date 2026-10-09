import { runTailscale } from './binary'

const statusTimeout = 5_000

export interface Detected {
  installed: boolean
  running: boolean
  name?: string
  ip?: string
  target?: string
  error?: string
}

interface StatusJson {
  BackendState?: string
  Self?: { DNSName?: string; TailscaleIPs?: string[] }
}

interface Handler {
  Proxy?: string
  Path?: string
  Text?: string
}

interface ServeJson {
  TCP?: Record<string, { HTTPS?: boolean; TCPForward?: string } | undefined>
  Web?: Record<string, { Handlers?: Record<string, Handler | undefined> } | undefined>
}

const parse = <T>(text: string): T | undefined => {
  try {
    const value = JSON.parse(text) as unknown
    return value && typeof value === 'object' ? (value as T) : undefined
  } catch {
    return undefined
  }
}

const isIpv4 = (ip: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)

export const sandTarget = (port: number) => `http://127.0.0.1:${port}`

export const normaliseTarget = (target: string) => target.trim().replace(/\/+$/, '').replace('://localhost:', '://127.0.0.1:')

const describeHandler = (handler: Handler) => {
  if (handler.Proxy) return normaliseTarget(handler.Proxy)
  if (handler.Path) return `files in ${handler.Path}`
  return 'a fixed text reply'
}

const targetOn443 = (serve: ServeJson, name: string) => {
  const handler = serve.Web?.[`${name}:443`]?.Handlers?.['/']
  if (handler) return describeHandler(handler)
  const forward = serve.TCP?.['443']?.TCPForward
  return forward ? `a TCP forward to ${forward}` : undefined
}

const readServe = async (binary: string, name: string) => {
  const result = await runTailscale(binary, ['serve', 'status', '--json'], statusTimeout)
  if (result.code !== 0) return undefined
  const serve = parse<ServeJson>(result.stdout)
  return serve ? targetOn443(serve, name) : undefined
}

export const detect = async (binary: string | undefined): Promise<Detected> => {
  if (!binary) return { installed: false, running: false }
  const result = await runTailscale(binary, ['status', '--json'], statusTimeout)
  const status = parse<StatusJson>(result.stdout)
  if (result.timedOut) return { installed: true, running: false, error: `tailscale status did not answer within ${statusTimeout / 1000} s` }
  if (!status) return { installed: true, running: false }
  const name = status.Self?.DNSName?.replace(/\.$/, '') || undefined
  const ip = status.Self?.TailscaleIPs?.find(isIpv4)
  const running = status.BackendState === 'Running'
  const base = { installed: true, running, ...(name ? { name } : {}), ...(ip ? { ip } : {}) }
  if (!running || !name) return base
  const target = await readServe(binary, name)
  return target ? { ...base, target } : base
}
