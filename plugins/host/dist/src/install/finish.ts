import type { HttpRoute } from '@sand/host-gateway/contract'
import { isRecord } from '@sand/util'
import { parseHealth } from '@sand/util/boot'
import { readText } from '@sand/util/host'
import type { InstallKeys } from '../installs'
import { expired, installSecret } from './base'

const errorLimit = 16 * 1024
const unknownFailure = 'the new PC stopped without saying why'
const reportable = ['connected', 'sand', 'sharing'] as const

const done = () => new Response(null, { status: 204 })

const parseJson = (body: string): unknown => {
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

const accountsOf = (body: string | undefined) => {
  const data = parseJson(body ?? '')
  const accounts = isRecord(data) ? data.accounts : undefined
  return Array.isArray(accounts) ? accounts.filter((name): name is string => typeof name === 'string' && !!name).slice(0, 8) : []
}

const failure = (body: string, json: boolean) => {
  const data = json ? parseJson(body) : undefined
  if (data === undefined || data === null) return { error: body || unknownFailure }
  const fields = isRecord(data) ? data : {}
  const report = parseHealth(fields.health)
  const error = typeof fields.error === 'string' ? fields.error.trim() : ''
  return { error: error || unknownFailure, ...(report ? { health: report } : {}) }
}

export const doneRoute = (installs: Pick<InstallKeys, 'step' | 'finish'>): HttpRoute => ({
  method: 'POST',
  async handle(call) {
    const secret = installSecret(call)
    const accounts = accountsOf(await readText(call.request, errorLimit))
    if (!secret || !installs.step(secret, 'ready', { accounts })) return expired()
    installs.finish(secret)
    return done()
  },
})

export const stepRoute = (installs: Pick<InstallKeys, 'step'>): HttpRoute => ({
  method: 'POST',
  handle(call) {
    const secret = installSecret(call)
    const step = reportable.find(item => item === call.url.searchParams.get('step'))
    if (!step) return new Response('unknown step', { status: 400 })
    if (!secret || !installs.step(secret, step)) return expired()
    return done()
  },
})

export const failRoute = (installs: Pick<InstallKeys, 'check' | 'step'>): HttpRoute => ({
  method: 'POST',
  async handle(call) {
    const secret = installSecret(call)
    if (!secret || !installs.check(secret)) return expired()
    const body = (await readText(call.request, errorLimit))?.trim() ?? ''
    const json = call.request.headers.get('content-type')?.startsWith('application/json') ?? false
    installs.step(secret, 'failed', failure(body, json))
    return done()
  },
})
