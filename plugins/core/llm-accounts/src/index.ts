import type { Server } from '@sand/server/contract'
import type { Limits, LLM, LoginProvider, LoginSharePc } from './contract'
import { definePlugin } from 'drydock'
import { createAccounts } from './auth/accounts'
import { authPath } from './auth/path'
import { createLogin } from './auth/login'
import { createClaude } from './claude/client'
import { claudeModels } from './claude/models'
import { createCodex } from './codex/client'
import { codexModels } from './codex/models'
import { config } from './config'
import { mergeLLM } from './llm'
import { createLocal } from './local'
import { createPeers } from './peers/peers'
import { watchRemotes } from './peers/watch'
import { serveLogin } from './serve'
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
    let llm: LLM | undefined
    let live = true
    let offered = ''

    const changed = () => {
      if (!live) return
      const now = (llm?.models?.() ?? []).map(model => `${model.id}@${model.via ?? ''}`).join()
      if (llm && now !== offered) {
        offered = now
        ctx.emit('llm.models')
      }
      server?.broadcast('login.change', [state()])
    }

    const { home } = ctx.cli
    const accounts = createAccounts(await authPath(home), changed)
    const login = createLogin(accounts)
    const users = createUsers((ctx.hot.data.sharePcs ??= new Map()) as Map<string, LoginSharePc>, changed)

    const notify = (text: string) => (ctx.ui ? ctx.ui.notify(text) : console.error(text))
    const onLimits = (parsed: Limits) => {
      limits = ctx.hot.data.limits = parsed
      ctx.emit('llm.limits', parsed)
    }
    const claude = createClaude({
      accounts,
      retries: config.max_retries,
      notify,
      settings: model => ({ model: model ?? config.claude_models[0] ?? claudeModels[0]!, maxTokens: config.max_tokens, thinking: config.thinking }),
      onLimits,
    })
    const codex = createCodex({ accounts, retries: config.max_retries, model: model => model ?? config.codex_models[0] ?? codexModels[0]! })

    await accounts.ready
    const local = createLocal({ accounts, config, claude, codex, limits: () => limits })
    const peers = createPeers({ home, changed, limitsChanged: parsed => ctx.emit('llm.limits', parsed) })
    llm = mergeLLM(local, peers, accounts)
    offered = (llm.models?.() ?? []).map(model => `${model.id}@${model.via ?? ''}`).join()

    const state = () => loginState(accounts, peers, users)

    const conflict = (provider: LoginProvider) => {
      const peer = peers.list().find(found => !found.refused && found.info?.accounts.some(account => account.provider === provider && account.method === 'oauth'))
      return peer && { device: peer.pc.id, pc: peer.pc.name }
    }

    ctx.provide('llm', llm)
    ctx.effect(() => watchRemotes(home, () => void peers.refresh()))
    ctx.effect(() => {
      const timer = setInterval(() => void peers.refresh(), refreshEvery)
      timer.unref?.()
      return () => {
        live = false
        clearInterval(timer)
        login.dispose()
      }
    })
    ctx.watch('server', found => {
      server = found
      if (!found) return
      const disposers = [
        serveLogin(found, accounts, login, { state, load: () => peers.refresh(), conflict }),
        serveShare(found, { local, accounts, users }),
      ]
      return () => {
        server = undefined
        disposers.forEach(dispose => dispose())
      }
    })
  },
})
