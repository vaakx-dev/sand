import { installParams } from '@sand/devices-contract'
import type { HttpRoute } from '@sand/host-gateway/contract'
import { isRecord } from '@sand/util'
import { parseHealth } from '@sand/util/boot'
import { readText } from '@sand/util/host'
import type { Installs } from '../installs'
import { expired, installToken } from './token'

const errorLimit = 16 * 1024
const unknownFailure = 'the new PC stopped without saying why'
const reportable = ['connected', 'sand', 'pairing', 'checking', 'sharing'] as const

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

export const doneRoute = (installs: Pick<Installs, 'step' | 'finish'>): HttpRoute => ({
  method: 'POST',
  async handle(call) {
    const token = installToken(call)
    const accounts = accountsOf(await readText(call.request, errorLimit))
    if (!token || !installs.step(token, 'ready', { accounts })) return expired()
    installs.finish(token)
    return done()
  },
})

export const stepRoute = (installs: Pick<Installs, 'step'>): HttpRoute => ({
  method: 'POST',
  handle(call) {
    const token = installToken(call)
    const step = reportable.find(item => item === call.url.searchParams.get(installParams.step))
    if (!step) return new Response('unknown step', { status: 400 })
    if (!token || !installs.step(token, step)) return expired()
    return done()
  },
})

export const failRoute = (installs: Pick<Installs, 'check' | 'step'>): HttpRoute => ({
  method: 'POST',
  async handle(call) {
    const token = installToken(call)
    if (!token || !installs.check(token)) return expired()
    const body = (await readText(call.request, errorLimit))?.trim() ?? ''
    const json = call.request.headers.get('content-type')?.startsWith('application/json') ?? false
    installs.step(token, 'failed', failure(body, json))
    return done()
  },
})
