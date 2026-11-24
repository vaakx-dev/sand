import { cacheLifetimes, llmPlans, type PlanLimits, type ProviderCapabilities } from '@sand/accounts/contract'
import { appPlan, type Place, type Provider } from '@sand/app-plan'
import { cli } from '@sand/config/contract'
import { media, type Media } from '@sand/media/contract'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { codexAccount } from './account/account'
import { limitsOf } from './account/limits'
import { codex, codexHome } from './server/binary'
import { createPool, type Pool } from './server/pool'
import { sessionFiles } from './session/files'
import { rolloutHistory } from './session/history'
import { openSession } from './session/session'
import pkg from '../package.json'

const CAPS: ProviderCapabilities = {
  native: true,
  resume: true,
  inject: true,
  reconfigure: ['effort'],
  processScope: 'thread',
  cacheTtlMs: cacheLifetimes.openai.short,
}

const reportLimits = (pool: Pool, report: (limits: PlanLimits) => void) =>
  pool.listen((method, params) => {
    if (method !== 'account/rateLimits/updated') return
    const limits = limitsOf(params.rateLimits)
    if (limits) report(limits)
  })

const placeOf = ({ folder }: Place, apps: string) => (folder ? { folder, home: folder } : { folder: apps, home: codexHome() })

const codexProvider = (media: Media, apps: string): Provider => ({
  id: 'codex',
  label: 'Codex',
  name: 'ChatGPT',
  detail: 'Uses your sign-in from the Codex app on this PC',
  logo: 'openai',
  family: 'openai',
  caps: CAPS,
  fixedTools: true,
  binary: codex,
  account(place, report) {
    const { folder, home } = placeOf(place, apps)
    const pool = createPool({ folder, home }, pkg.version)
    reportLimits(pool, report)
    return {
      ...codexAccount(pool),
      open: (setup, output, resume) => openSession({ pool, media, report }, setup, output, resume),
      sessionFiles: sessionFiles(home),
      history: rolloutHistory(home),
      close: () => pool.close(),
    }
  },
})

export default definePlugin({
  name: 'codex',
  description: 'Adds Codex to Settings → Accounts using the Codex app on this PC: sand runs codex app-server with sand’s own tools and prompt; the app keeps its own sign-in, and each ChatGPT account added beside it keeps its sign-in in its own folder',
  inject: { cli, media },
  async apply(ctx) {
    const apps = join(ctx.cli.home, 'apps', 'codex')
    await mkdir(apps, { recursive: true })
    ctx.watch(llmPlans, plans => plans?.register(appPlan(codexProvider(ctx.media, apps), plans)))
  },
})
