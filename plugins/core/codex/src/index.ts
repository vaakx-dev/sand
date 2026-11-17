import { llmPlans, type AppPlace, type AppPlan, type PlanLimits, type ProviderCapabilities } from '@sand/accounts/contract'
import { cli } from '@sand/config/contract'
import { media, type Media } from '@sand/media/contract'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { codexAccount } from './account/account'
import { limitsOf } from './account/limits'
import { codexHome, installUrl } from './server/binary'
import { type CodexPlace, createPool, type Pool } from './server/pool'
import { sessionFiles } from './session/files'
import { openSession } from './session/session'
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

interface Needs {
  media: Media
  report(account: string, limits: PlanLimits): void
}

const reportLimits = (pool: Pool, report: (limits: PlanLimits) => void) =>
  pool.listen((method, params) => {
    if (method !== 'account/rateLimits/updated') return
    const limits = limitsOf(params.rateLimits)
    if (limits) report(limits)
  })

const codexAccountPlan = ({ media, report }: Needs, id: string, place: CodexPlace): AppPlan => {
  const pool = createPool(place, pkg.version)
  const reported = (limits: PlanLimits) => report(id, limits)
  reportLimits(pool, reported)
  return {
    id,
    label: 'Codex',
    name: 'ChatGPT',
    detail: 'Uses your sign-in from the Codex app on this PC',
    logo: 'openai',
    app: 'Codex',
    install: installUrl,
    family: 'openai',
    caps,
    fixedTools: true,
    ...codexAccount(pool),
    open: (setup, output, resume) => openSession({ pool, media, report: reported }, setup, output, resume),
    sessionFiles: sessionFiles(place.home),
    close: () => pool.close(),
  }
}

const codexPlan = (needs: Needs, folder: string): AppPlan => ({
  ...codexAccountPlan(needs, 'codex', { folder, home: codexHome() }),
  another: ({ id, folder }: AppPlace) => codexAccountPlan(needs, id, { folder, home: folder }),
})

export default definePlugin({
  name: 'codex',
  description: 'Adds Codex to Settings → Accounts using the Codex app on this PC: sand runs codex app-server with sand’s own tools and prompt; the app keeps its own sign-in, and each ChatGPT account added beside it keeps its sign-in in its own folder',
  inject: { cli, media },
  async apply(ctx) {
    const folder = join(ctx.cli.home, 'apps', 'codex')
    await mkdir(folder, { recursive: true })
    ctx.watch(llmPlans, plans => plans?.register(codexPlan({ media: ctx.media, report: (account, limits) => plans.limits(account, limits) }, folder)))
  },
})
