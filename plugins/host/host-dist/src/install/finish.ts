import type { HttpRoute } from '@sand/host-gateway/contract'
import { parseHealth } from '@sand/kit/host'
import type { InstallKeys } from '../installs'
import { expired, installSecret, readText } from './base'

const errorLimit = 16 * 1024

type FinishKeys = Pick<InstallKeys, 'step' | 'finish'>

const done = () => new Response(null, { status: 204 })

const accountsOf = (body: string | undefined) => {
  try {
    const { accounts } = JSON.parse(body ?? '') as Record<string, unknown>
    return Array.isArray(accounts) ? accounts.filter((name): name is string => typeof name === 'string' && !!name).slice(0, 8) : []
  } catch {
    return []
  }
}

export const doneRoute = (installs: FinishKeys): HttpRoute => ({
  method: 'POST',
  async handle(call) {
    const secret = installSecret(call)
    const accounts = accountsOf(await readText(call.request, errorLimit))
    if (!secret || !installs.step(secret, 'ready', { accounts })) return expired()
    installs.finish(secret)
    return done()
  },
})

const reportable = ['connected', 'sand', 'sharing'] as const

type Reportable = (typeof reportable)[number]

const isReportable = (step: string | null): step is Reportable => reportable.includes(step as Reportable)

export const stepRoute = (installs: Pick<InstallKeys, 'step'>): HttpRoute => ({
  method: 'POST',
  handle(call) {
    const secret = installSecret(call)
    const step = call.url.searchParams.get('step')
    if (!isReportable(step)) return new Response('unknown step', { status: 400 })
    if (!secret || !installs.step(secret, step)) return expired()
    return done()
  },
})

const unknownFailure = 'the new PC stopped without saying why'

const failure = (body: string, json: boolean) => {
  if (!json) return { error: body || unknownFailure }
  try {
    const { error, health } = JSON.parse(body) as Record<string, unknown>
    const report = parseHealth(health)
    return { error: (typeof error === 'string' && error.trim()) || unknownFailure, ...(report ? { health: report } : {}) }
  } catch {
    return { error: body || unknownFailure }
  }
}

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
