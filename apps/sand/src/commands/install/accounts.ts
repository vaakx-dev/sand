import type { LoginState, ServerInfo } from '@sand/protocol'
import { ask } from '../../daemon/ask'

const patience = 30_000
const pause = 2000

const named = (state: LoginState) => [...new Set(state.remote.filter(account => account.inUse).map(account => (account.method === 'oauth' ? account.subscription : account.label)))]

export const waitForAccounts = async (info: Pick<ServerInfo, 'url' | 'key'>, from: string) => {
  const until = Date.now() + patience
  for (;;) {
    const state = await ask<LoginState>(info, { type: 'login.status' }, 20_000).catch(() => undefined)
    if (!state) return []
    if (state.pcs.find(found => found.device === from)?.checked || Date.now() > until) return named(state)
    await Bun.sleep(pause)
  }
}
