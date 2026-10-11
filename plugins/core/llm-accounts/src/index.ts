import type { Server } from '@sand/server/contract'
import type { Limits, LoginSharePc, SignInKind } from './contract'
import { joinDisposers } from '@sand/kit'
import { watchRemotes } from '@sand/kit/host'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { createAccounts } from './auth/accounts'
import { createLogin } from './auth/login'
import { authPath } from './auth/path'
import { createCatalog } from './catalog'
import { priceList, priceSchema } from './catalog/prices'
import { createClaude } from './claude/client'
import { createCodex } from './codex/client'
import { createCompat } from './compat/client'
import { mergeLLM } from './llm'
import { createLocal } from './local'
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
    let limits = (ctx.hot.data.sourceLimits ?? {}) as Record<string, Limits>
    let server: Server | undefined
    let live = true
    let onChange = () => {}
    const changed = () => {
      if (live) onChange()
    }

    const { home } = ctx.cli
    const accounts = createAccounts(await authPath(home), changed)
    const login = createLogin(accounts)
    const users = createUsers((ctx.hot.data.sharePcs ??= new Map()) as Map<string, LoginSharePc>, changed)
    const catalog = createCatalog({ home, accounts, prices: priceList(options.prices), changed, report: error => ctx.report(error) })

    const notify = (text: string) => (ctx.ui ? ctx.ui.notify(text) : console.error(text))
    const onLimits = (parsed: Limits) => {
      limits = ctx.hot.data.sourceLimits = { ...limits, [parsed.source]: parsed }
      ctx.emit('llm.limits', parsed)
    }
    const claude = createClaude({ accounts, maxTokens, retries, notify, onLimits })
    const codex = createCodex({ accounts, retries, onLimits })
    const compat = createCompat({ retries })

    await Promise.all([accounts.ready, catalog.ready])
    const local = createLocal({ accounts, catalog, claude, codex, compat, limits: () => limits })
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

    const conflict = (account: SignInKind) => {
      const peer = peers.list().find(found => !found.refused && found.info?.accounts.some(shared => shared.id === account))
      return peer && { device: peer.pc.id, pc: peer.pc.name }
    }

    ctx.provide('llm', merged.llm)
    ctx.effect(() => watchRemotes(home, () => void peers.refresh()))
    ctx.effect(() => {
      const peerTimer = setInterval(() => void peers.refresh(), refreshEvery)
      const discoverTimer = setInterval(() => void catalog.refresh(), discoverEvery)
      peerTimer.unref?.()
      discoverTimer.unref?.()
      return () => {
        live = false
        clearInterval(peerTimer)
        clearInterval(discoverTimer)
        login.dispose()
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
        serveLogin(found, accounts, login, { state, load: () => peers.refresh(), conflict }),
        serveModels(found, { view: merged.view, catalog, refreshPeers: () => peers.refresh() }),
        serveShare(found, { local, accounts, users }),
      )
    })
  },
})
