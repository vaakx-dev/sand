import type { Server } from '@sand/server/contract'
import type { Limits, LoginSharePc } from './contract'
import { joinDisposers } from '@sand/kit'
import { watchRemotes } from '@sand/kit/host'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createBridges } from './apps/bridges'
import { createAccounts } from './auth/accounts'
import { appStatusFile } from './auth/app-status'
import { createLogin } from './auth/login'
import { authPath } from './auth/path'
import { createPlans } from './auth/plans'
import { createCatalog } from './catalog'
import { priceList, priceSchema } from './catalog/prices'
import { createClaude } from './claude/client'
import { createCompat } from './compat/client'
import { createLimits } from './limits'
import { mergeLLM } from './llm'
import { createLocal } from './local'
import { createOpenAI } from './openai/client'
import { createPeers } from './peers/peers'
import { serveLogin } from './serve/login'
import { serveModels } from './serve/models'
import { serveShare } from './share/routes'
import { createUsers } from './share/users'
import { loginState } from './state'

const refreshEvery = 60_000
const discoverEvery = 6 * 3_600_000
const maxTokens = 64_000
const retries = 4

export default definePlugin({
  name: 'llm-accounts',
  inject: ['cli'],
  config: z.object({ prices: z.record(z.string(), priceSchema).default({}) }).default({ prices: {} }),
  async apply(ctx, options) {
    let server: Server | undefined
    let live = true
    let onChange = () => {}
    const changed = () => {
      if (live) onChange()
    }

    const { home } = ctx.cli
    const appsFolder = join(home, 'apps')
    await mkdir(appsFolder, { recursive: true })
    const bridges = createBridges(appsFolder)
    const statusFile = appStatusFile(appsFolder)
    const plans = createPlans({ saved: await statusFile.read(), save: statusFile.write, changed, dropped: bridges.forget })
    const accounts = createAccounts(await authPath(home), plans, changed)
    const login = createLogin(accounts, plans)
    const users = createUsers((ctx.hot.data.sharePcs ??= new Map()) as Map<string, LoginSharePc>, changed)
    const catalog = createCatalog({ home, accounts, plans, prices: priceList(options.prices), changed, report: error => ctx.report(error) })

    const notify = (text: string) => (ctx.ui ? ctx.ui.notify(text) : console.error(text))
    const limits = createLimits({
      saved: (ctx.hot.data.sourceLimits ?? {}) as Record<string, Limits>,
      changed: (all, found) => {
        ctx.hot.data.sourceLimits = all
        ctx.emit('llm.limits', found)
      },
      report: error => ctx.report(error),
    })
    const inspect = (account: string) => limits.inspect(plans.api(account))
    const claude = createClaude({ accounts, plans, maxTokens, retries, inspect, notify })
    const openai = createOpenAI({ accounts, plans, retries, inspect })
    const compat = createCompat({ retries })

    await Promise.all([accounts.ready, catalog.ready])
    const local = createLocal({ accounts, plans, catalog, claude, openai, compat, bridges, limits })
    const peers = createPeers({ home, changed, limitsChanged: parsed => ctx.emit('llm.limits', parsed) })
    const merged = mergeLLM(local, peers, accounts, catalog)
    const state = () => loginState(accounts, peers, users)
    const signature = () => JSON.stringify([merged.llm.models(), merged.llm.sources()])
    let offered = signature()

    onChange = () => {
      local.view.reset()
      merged.reset()
      catalog.sync()
      const now = signature()
      if (now !== offered) {
        offered = now
        ctx.emit('llm.models')
      }
      server?.broadcast('login.change', [state()])
    }
    catalog.sync()

    const conflict = (account: string) => {
      if (plans.app(account)) return undefined
      const peer = peers.list().find(found => !found.refused && found.info?.accounts.some(shared => shared.id === account))
      return peer && { device: peer.pc.id, pc: peer.pc.name }
    }

    ctx.provide('llm', merged.llm)
    ctx.provide('llmPlans', { register: plans.register, limits: limits.save })
    ctx.effect(() => watchRemotes(home, () => void peers.refresh()))
    ctx.effect(() => {
      const peerTimer = setInterval(() => void Promise.all([peers.refresh(), plans.refresh()]), refreshEvery)
      const discoverTimer = setInterval(() => void catalog.refresh(), discoverEvery)
      peerTimer.unref?.()
      discoverTimer.unref?.()
      return () => {
        live = false
        clearInterval(peerTimer)
        clearInterval(discoverTimer)
        login.dispose()
        bridges.close()
      }
    })
    ctx.watch('server', found => {
      server = found
      if (!found) return
      const forget = () => {
        server = undefined
      }
      return joinDisposers(
        forget,
        serveLogin(found, accounts, login, { plans, state, load: () => Promise.all([peers.refresh(), plans.refresh()]).then(() => {}), conflict }),
        serveModels(found, { view: merged.view, catalog, refreshPeers: () => peers.refresh() }),
        serveShare(found, { local, accounts, users }),
      )
    })
  },
})
