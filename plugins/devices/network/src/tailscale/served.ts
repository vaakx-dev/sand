import { trimSlash } from '@sand/util'
import { runTailscale } from './binary'
import { parseJson, statusTimeout } from './status'

interface Handler {
  Proxy?: string
  Path?: string
  Text?: string
}

interface ServeJson {
  TCP?: Record<string, { HTTPS?: boolean; TCPForward?: string } | undefined>
  Web?: Record<string, { Handlers?: Record<string, Handler | undefined> } | undefined>
}

const normaliseTarget = (target: string) => trimSlash(target.trim()).replace('://localhost:', '://127.0.0.1:')

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

export const servedOn443 = async (binary: string, name: string) => {
  const result = await runTailscale(binary, ['serve', 'status', '--json'], statusTimeout)
  if (result.code !== 0) return undefined
  const serve = parseJson<ServeJson>(result.stdout)
  return serve ? targetOn443(serve, name) : undefined
}
