import { lazy } from '@sand/util'
import { z } from 'zod'
import { runTailscale } from './binary'

export const statusTimeout = 5_000

const nodeSchema = lazy(() =>
  z.object({
    HostName: z.string().nullish(),
    DNSName: z.string().nullish(),
    OS: z.string().nullish(),
    TailscaleIPs: z.array(z.string()).nullish(),
    Online: z.boolean().nullish(),
  }),
)

const statusSchema = lazy(() =>
  z.object({ BackendState: z.string().nullish(), Self: nodeSchema().nullish(), Peer: z.record(z.string(), nodeSchema().nullish()).nullish() }),
)

export type StatusNode = z.infer<ReturnType<typeof nodeSchema>>

export type StatusRead = { ok: true; status: z.infer<ReturnType<typeof statusSchema>> } | { ok: false; timedOut: boolean }

export const parseJson = <S extends z.ZodType>(text: string, schema: S): z.infer<S> | undefined => {
  try {
    return schema.safeParse(JSON.parse(text)).data
  } catch {
    return undefined
  }
}

export const readStatus = async (binary: string): Promise<StatusRead> => {
  const result = await runTailscale(binary, ['status', '--json'], statusTimeout)
  const status = parseJson(result.stdout, statusSchema())
  return status ? { ok: true, status } : { ok: false, timedOut: result.timedOut }
}

export const dnsName = (node: StatusNode | null | undefined) => node?.DNSName?.replace(/\.$/, '') || undefined

export const ipv4Of = (node: StatusNode | null | undefined) => node?.TailscaleIPs?.find(ip => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip))
