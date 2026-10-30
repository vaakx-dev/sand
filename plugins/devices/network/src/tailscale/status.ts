import { isRecord } from '@sand/util'
import { runTailscale } from './binary'

export const statusTimeout = 5_000

export interface StatusNode {
  HostName?: string
  DNSName?: string
  OS?: string
  TailscaleIPs?: string[]
  Online?: boolean
}

export interface StatusJson {
  BackendState?: string
  Self?: StatusNode
  Peer?: Record<string, StatusNode | undefined>
}

export type StatusRead = { ok: true; status: StatusJson } | { ok: false; timedOut: boolean }

export const parseJson = <T>(text: string): T | undefined => {
  try {
    const value: unknown = JSON.parse(text)
    return isRecord(value) ? (value as T) : undefined
  } catch {
    return undefined
  }
}

export const readStatus = async (binary: string): Promise<StatusRead> => {
  const result = await runTailscale(binary, ['status', '--json'], statusTimeout)
  const status = parseJson<StatusJson>(result.stdout)
  return status ? { ok: true, status } : { ok: false, timedOut: result.timedOut }
}

export const dnsName = (node: StatusNode | undefined) => node?.DNSName?.replace(/\.$/, '') || undefined

export const ipv4Of = (node: StatusNode | undefined) => node?.TailscaleIPs?.find(ip => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip))
