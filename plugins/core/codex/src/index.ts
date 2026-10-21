import { llmPlans, type AppPlan, type PlanLimits } from '@sand/accounts/contract'
import { cli } from '@sand/config/contract'
import { definePlugin } from 'drydock'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { codexAccount } from './account/account'
import { limitsOf } from './account/limits'
import { installUrl } from './server/binary'
import { createServer, type CodexServer } from './server/server'
import { openSession } from './session/session'
import pkg from '../package.json'

const codexPlan = (server: CodexServer): AppPlan => ({
  id: 'codex',
  label: 'Codex',
  name: 'ChatGPT',
  detail: 'Uses your sign-in from the Codex app on this PC',
  logo: 'openai',
  app: 'Codex',
  install: installUrl,
  family: 'openai',
  ...codexAccount(server),
  open: (setup, output) => openSession(server, setup, output),
})

const reportLimits = (server: CodexServer, report: (limits: PlanLimits) => void) =>
  server.listen((method, params) => {
    if (method !== 'account/rateLimits/updated') return
    const limits = limitsOf(params.rateLimits)
    if (limits) report(limits)
  })

export default definePlugin({
  name: 'codex',
  description: 'Adds Codex to Settings → Accounts using the Codex app on this PC: sand runs codex app-server with sand’s own tools and prompt, and the app keeps its own sign-in',
  inject: { cli },
  async apply(ctx) {
    const folder = join(ctx.cli.home, 'apps', 'codex')
    await mkdir(folder, { recursive: true })
    const server = createServer(folder, pkg.version)
    ctx.effect(() => () => server.close())
    ctx.watch(llmPlans, plans => {
      if (!plans) return
      const stopLimits = reportLimits(server, limits => plans.limits('codex', limits))
      const unregister = plans.register(codexPlan(server))
      return () => {
        stopLimits()
        unregister()
      }
    })
  },
})
