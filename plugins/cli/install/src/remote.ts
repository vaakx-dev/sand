import { type InstallDone, installParams, installPaths, type InstallStep, pageLinkKeys } from '@sand/devices-contract'
import type { HostHealth } from '@sand/host-health/contract'
import { trimSlash } from '@sand/util'

export interface JoinGrant {
  link: string
  base: string
  token: string
}

interface Failure {
  summary: string
  health?: HostHealth
}

const failLimit = 16_000

export const joinGrantOf = (link: string): JoinGrant => {
  const url = URL.parse(link.trim())
  const token = url && new URLSearchParams(url.hash.slice(1)).get(pageLinkKeys.pair)
  if (!url || !/^https?:$/.test(url.protocol) || !token) throw new Error('the join link is not one from Add a PC; copy the install command again')
  return { link: url.href, base: trimSlash(`${url.origin}${url.pathname}`), token }
}

export const installEndpoint = ({ base, token }: JoinGrant, path: string, step?: InstallStep) => {
  const url = new URL(`${base}${path}`)
  url.searchParams.set(installParams.token, token)
  if (step) url.searchParams.set(installParams.step, step)
  return url.href
}

const postJson = async (url: string, body: unknown, timeout: number) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw new Error((await response.text().catch(() => '')) || `the other PC answered ${response.status}`)
}

export const reportStep = async (grant: JoinGrant, step: InstallStep) => {
  await fetch(installEndpoint(grant, installPaths.step, step), { method: 'POST', signal: AbortSignal.timeout(15_000) }).catch(() => undefined)
}

export const reportDone = (grant: JoinGrant, accounts: string[]) => {
  const body: InstallDone = { accounts }
  return postJson(installEndpoint(grant, installPaths.done), body, 15_000)
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

export const reportFail = async (grant: JoinGrant, message: string, failure?: Failure) => {
  const { type, body } = failBody(message, failure)
  try {
    await fetch(installEndpoint(grant, installPaths.fail), {
      method: 'POST',
      headers: { 'content-type': type },
      body,
      signal: AbortSignal.timeout(10_000),
    })
  } catch {}
}
