import type { Server } from '@sand/server/contract'
import type { Limits, LoginSharePc, SignInKind } from './contract'
import { definePlugin } from 'drydock'
import { createAccounts } from './auth/accounts'
import { createLogin } from './auth/login'
import { authPath } from './auth/path'
import { createCatalog } from './catalog'
import { createClaude } from './claude/client'
import { createCodex } from './codex/client'
import { createCompat } from './compat/client'
import { config } from './config'
import { mergeLLM } from './llm'
import { createLocal } from './local'
import { createPeers } from './peers/peers'
import { watchRemotes } from './peers/watch'
import { serveLogin } from './serve/login'
import { serveModels } from './serve/models'
import { serveShare } from './share/routes'
import { createUsers } from './share/users'
import { loginState } from './state'

const refreshEvery = 60_000

export default definePlugin({
  name: 'llm-accounts',
  inject: ['cli'],
  async apply(ctx) {
    let limits = ctx.hot.data.limits as Limits | undefined
    let server: Server | undefined
    let merged: ReturnType<typeof mergeLLM> | undefined
    let state: (() => ReturnType<typeof loginState>) | undefined
    let syncing = false
    let live = true
    let offered = ''
    let resetViews = () => {}

    const signature = () => (merged ? JSON.stringify([merged.llm.models(), merged.llm.sources()]) : '')

    const changed = () => {
      if (!live) return
      resetViews()
      if (syncing) catalog.sync()
      const now = signature()
      if (merged && now !== offered) {
        offered = now
        ctx.emit('llm.models')
      }
      if (state) server?.broadcast('login.change', [state()])
    }

    const { home } = ctx.cli
    const accounts = createAccounts(await authPath(home), changed)
    const login = createLogin(accounts)
    const users = createUsers((ctx.hot.data.sharePcs ??= new Map()) as Map<string, LoginSharePc>, changed)
    const catalog = createCatalog({ home, accounts, changed })

    const notify = (text: string) => (ctx.ui ? ctx.ui.notify(text) : console.error(text))
    const onLimits = (parsed: Limits) => {
      limits = ctx.hot.data.limits = parsed
      ctx.emit('llm.limits', parsed)
    }
    const claude = createClaude({ accounts, maxTokens: config.max_tokens, thinking: config.thinking, retries: config.max_retries, notify, onLimits })
    const codex = createCodex({ accounts, retries: config.max_retries })
    const compat = createCompat({ retries: config.max_retries })

    await Promise.all([accounts.ready, catalog.ready])
    const local = createLocal({ accounts, catalog, claude, codex, compat, limits: () => limits })
    const peers = createPeers({ home, changed, limitsChanged: parsed => ctx.emit('llm.limits', parsed) })
    const llm = mergeLLM(local, peers, accounts, catalog)
    merged = llm
    resetViews = () => {
      local.view.reset()
      llm.reset()
    }
    offered = signature()
    state = () => loginState(accounts, peers, users)
    syncing = true
    catalog.sync()

    const conflict = (account: SignInKind) => {
      const peer = peers.list().find(found => !found.refused && found.info?.accounts.some(shared => shared.id === account))
      return peer && { device: peer.pc.id, pc: peer.pc.name }
    }

    ctx.provide('llm', merged.llm)
    ctx.effect(() => watchRemotes(home, () => void peers.refresh()))
    ctx.effect(() => {
      const peerTimer = setInterval(() => void peers.refresh(), refreshEvery)
      const discoverTimer = setInterval(() => void catalog.refresh(), config.discover_every)
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
      if (!found || !merged || !state) return
      const disposers = [
        serveLogin(found, accounts, login, { state, load: () => peers.refresh(), conflict }),
        serveModels(found, { view: merged.view, catalog, refreshPeers: () => peers.refresh() }),
        serveShare(found, { local, accounts, users }),
      ]
      return () => {
        server = undefined
        disposers.forEach(dispose => dispose())
      }
    })
  },
})
