import { lazy, trimSlash } from '@sand/util'
import { z } from 'zod'
import { runTailscale } from './binary'
import { parseJson, statusTimeout } from './status'

const handlerSchema = lazy(() => z.object({ Proxy: z.string().nullish(), Path: z.string().nullish(), Text: z.string().nullish() }))

const serveSchema = lazy(() =>
  z.object({
    TCP: z.record(z.string(), z.object({ HTTPS: z.boolean().nullish(), TCPForward: z.string().nullish() }).nullish()).nullish(),
    Web: z.record(z.string(), z.object({ Handlers: z.record(z.string(), handlerSchema().nullish()).nullish() }).nullish()).nullish(),
  }),
)

type Handler = z.infer<ReturnType<typeof handlerSchema>>

type ServeJson = z.infer<ReturnType<typeof serveSchema>>

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
  const serve = parseJson(result.stdout, serveSchema())
  return serve ? targetOn443(serve, name) : undefined
}
