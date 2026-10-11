import type { InstallDoneRequest, InstallPairRequest, InstallPairResult } from '@sand/host-dist/contract'
import type { HostHealth } from '@sand/host-health/contract'
import { hostPaths, trimSlash } from '@sand/kit'

interface Failure {
  summary: string
  health?: HostHealth
}

const failLimit = 16_000

const endpoint = (base: string, path: string, secret: string) => `${trimSlash(base)}${path}?k=${encodeURIComponent(secret)}`

const postJson = async (url: string, body: unknown, timeout: number) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw new Error((await response.text().catch(() => '')) || `the old PC answered ${response.status}`)
  return response
}

export const pairWithOld = async (base: string, secret: string, body: InstallPairRequest) => {
  const response = await postJson(endpoint(base, hostPaths.installPair, secret), body, 60_000)
  return (await response.json()) as InstallPairResult
}

export const reportSharing = async (base: string, secret: string) => {
  await fetch(`${endpoint(base, hostPaths.installStep, secret)}&step=sharing`, { method: 'POST', signal: AbortSignal.timeout(15_000) }).catch(() => undefined)
}

export const reportDone = async (base: string, secret: string, accounts: string[]) => {
  const body: InstallDoneRequest = { accounts }
  await postJson(endpoint(base, hostPaths.installDone, secret), body, 15_000)
}

const clip = (text: string) => new TextDecoder().decode(new TextEncoder().encode(text).slice(0, failLimit))

const size = (text: string) => new TextEncoder().encode(text).byteLength

const withHealth = (error: string, health: HostHealth) => {
  let log = health.log
  for (;;) {
    const body = JSON.stringify({ error, health: { ...health, log } })
    if (size(body) <= failLimit) return body
    if (!log.length) return
    log = log.slice(1)
  }
}

const failBody = (message: string, failure?: Failure) => {
  const json = failure?.health && withHealth(failure.summary, failure.health)
  return json ? { type: 'application/json', body: json } : { type: 'text/plain', body: clip(message) }
}

export const reportFail = async (base: string, secret: string, message: string, failure?: Failure) => {
  const { type, body } = failBody(message, failure)
  try {
    await fetch(endpoint(base, hostPaths.installFail, secret), {
      method: 'POST',
      headers: { 'content-type': type },
      body,
      signal: AbortSignal.timeout(10_000),
    })
  } catch {}
}
