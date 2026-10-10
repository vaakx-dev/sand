import type { DetectedServer, KeyKind, ServerDraft, SignInKind } from '../contract'
import { detectServers } from '../discover'
import type { Accounts } from './accounts'
import { authorizeClaude, exchangeClaude, type ClaudeFlow } from './anthropic'
import { deviceTimeout, deviceUrl, pollDevice, startDevice } from './openai'
import { checkServer, serverEntry } from './servers'

export type Login = ReturnType<typeof createLogin>

export const createLogin = (accounts: Accounts) => {
  let claude: ClaudeFlow | undefined
  let device: AbortController | undefined

  const stopDevice = () => {
    device?.abort()
    device = undefined
  }

  const startCodex = async () => {
    stopDevice()
    const controller = (device = new AbortController())
    const started = await startDevice(controller.signal)
    const expires = Date.now() + deviceTimeout
    accounts.pend('codex', { kind: 'device', url: deviceUrl, code: started.code, expires })
    pollDevice(started, expires, controller.signal)
      .then(tokens => (controller.signal.aborted ? undefined : accounts.signIn('codex', tokens)))
      .catch(error => {
        if (controller.signal.aborted) return
        accounts.pend('codex', undefined)
        accounts.fail('codex', error)
      })
      .finally(() => {
        if (device === controller) device = undefined
      })
  }

  const start = async (account: SignInKind) => {
    try {
      if (account === 'codex') await startCodex()
      else {
        claude = await authorizeClaude()
        accounts.pend('claude', { kind: 'paste', url: claude.url })
      }
    } catch (error) {
      accounts.fail(account, error)
    }
  }

  const finish = async (account: SignInKind, code: string) => {
    if (account !== 'claude') return
    if (!claude) return accounts.fail(account, 'Start signing in first')
    try {
      await accounts.signIn(account, await exchangeClaude(code, claude))
      claude = undefined
    } catch (error) {
      accounts.fail(account, error)
    }
  }

  const cancel = (account: string) => {
    if (account === 'codex') stopDevice()
    if (account === 'claude') claude = undefined
    accounts.pend(account, undefined)
  }

  const key = async (account: KeyKind, value: string, baseUrl = '') => {
    if (!value) return accounts.fail(account, 'Enter an API key')
    if (baseUrl && !/^https?:\/\/[^\s/]+/i.test(baseUrl)) return accounts.fail(account, 'Base URL must start with http:// or https://')
    cancel(account)
    await accounts.saveKey(account, value, baseUrl)
  }

  const server = async (draft: ServerDraft) => {
    await accounts.ready
    const entry = serverEntry(draft, accounts.servers())
    await accounts.saveServer(entry, await checkServer(entry))
  }

  const detect = async (): Promise<DetectedServer[]> => {
    await accounts.ready
    const added = new Set(accounts.servers().map(found => found.url))
    return (await detectServers()).filter(found => !added.has(found.url.replace(/\/+$/, '')))
  }

  const logout = async (account: string) => {
    cancel(account)
    await accounts.signOut(account)
  }

  return { start, finish, key, server, detect, cancel, logout, dispose: stopDevice }
}
