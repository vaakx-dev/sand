import { llmPlans, type AppPlan, type PlanLimits, type ProviderCapabilities } from '@sand/accounts/contract'
import { cli } from '@sand/config/contract'
import { media } from '@sand/media/contract'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { codexAccount } from './account/account'
import { limitsOf } from './account/limits'
import { installUrl } from './server/binary'
import { createPool, type Pool } from './server/pool'
import { sessionFiles } from './session/files'
import { openSession, type SessionNeeds } from './session/session'
import pkg from '../package.json'

const caps: ProviderCapabilities = {
  native: true,
  resume: true,
  inject: true,
  steer: true,
  reconfigure: ['effort'],
  processScope: 'thread',
  cacheTtlMs: 10 * 60_000,
}

const codexPlan = (needs: SessionNeeds): AppPlan => ({
  id: 'codex',
  label: 'Codex',
  name: 'ChatGPT',
  detail: 'Uses your sign-in from the Codex app on this PC',
  logo: 'openai',
  app: 'Codex',
  install: installUrl,
  family: 'openai',
  caps,
  fixedTools: true,
  ...codexAccount(needs.pool),
  open: (setup, output, resume) => openSession(needs, setup, output, resume),
  sessionFiles,
})

const reportLimits = (pool: Pool, report: (limits: PlanLimits) => void) =>
  pool.listen((method, params) => {
    if (method !== 'account/rateLimits/updated') return
    const limits = limitsOf(params.rateLimits)
    if (limits) report(limits)
  })

export default definePlugin({
  name: 'codex',
  description: 'Adds Codex to Settings → Accounts using the Codex app on this PC: sand runs codex app-server with sand’s own tools and prompt, and the app keeps its own sign-in',
  inject: { cli, media },
  async apply(ctx) {
    const folder = join(ctx.cli.home, 'apps', 'codex')
    await mkdir(folder, { recursive: true })
    const pool = createPool(folder, pkg.version)
    ctx.effect(() => () => pool.close())
    ctx.watch(llmPlans, plans => {
      if (!plans) return
      const stopLimits = reportLimits(pool, limits => plans.limits('codex', limits))
      const unregister = plans.register(codexPlan({ pool, media: ctx.media }))
      return () => {
        stopLimits()
        unregister()
      }
    })
  },
})
