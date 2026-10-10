import type { Daemon } from '@sand/protocol'
import type { LoginState } from '@sand/llm-accounts/contract'

const patience = 30_000
const pause = 2000

const named = (state: LoginState) => [...new Set(state.remote.filter(account => account.inUse).map(account => account.label))]

export const waitForAccounts = async (daemon: Daemon, from: string) => {
  const until = Date.now() + patience
  for (;;) {
    const state = await daemon.request<LoginState>({ type: 'login.status' }, { timeout: 20_000 }).catch(() => undefined)
    if (!state) return []
    if (state.pcs.find(found => found.device === from)?.checked || Date.now() > until) return named(state)
    await Bun.sleep(pause)
  }
}
