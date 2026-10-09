import type { LoginProvider } from '../contract'
import type { Accounts } from './accounts'
import { authorizeClaude, exchangeClaude, type ClaudeFlow } from './anthropic'
import { deviceTimeout, deviceUrl, pollDevice, startDevice } from './openai'

export type Login = ReturnType<typeof createLogin>

export const createLogin = (accounts: Accounts) => {
  let claude: ClaudeFlow | undefined
  let device: AbortController | undefined

  const stopDevice = () => {
    device?.abort()
    device = undefined
  }

  const startOpenAI = async () => {
    stopDevice()
    const controller = (device = new AbortController())
    const started = await startDevice(controller.signal)
    const expires = Date.now() + deviceTimeout
    accounts.pend('openai', { kind: 'device', url: deviceUrl, code: started.code, expires })
    pollDevice(started, expires, controller.signal)
      .then(tokens => (controller.signal.aborted ? undefined : accounts.signIn('openai', tokens)))
      .catch(error => {
        if (controller.signal.aborted) return
        accounts.pend('openai', undefined)
        accounts.fail('openai', error)
      })
      .finally(() => {
        if (device === controller) device = undefined
      })
  }

  const start = async (provider: LoginProvider) => {
    try {
      if (provider === 'openai') await startOpenAI()
      else {
        claude = await authorizeClaude()
        accounts.pend('anthropic', { kind: 'paste', url: claude.url })
      }
    } catch (error) {
      accounts.fail(provider, error)
    }
  }

  const finish = async (provider: LoginProvider, code: string) => {
    if (provider !== 'anthropic') return
    if (!claude) return accounts.fail(provider, 'Start signing in first')
    try {
      await accounts.signIn(provider, await exchangeClaude(code, claude))
      claude = undefined
    } catch (error) {
      accounts.fail(provider, error)
    }
  }

  const cancel = (provider: LoginProvider) => {
    if (provider === 'openai') stopDevice()
    else claude = undefined
    accounts.pend(provider, undefined)
  }

  const key = async (provider: LoginProvider, value: string, baseUrl = '') => {
    if (!value) return accounts.fail(provider, 'Enter an API key')
    if (baseUrl && !/^https?:\/\/[^\s/]+/i.test(baseUrl)) return accounts.fail(provider, 'Base URL must start with http:// or https://')
    cancel(provider)
    await accounts.saveKey(provider, value, baseUrl)
  }

  const logout = async (provider: LoginProvider) => {
    cancel(provider)
    await accounts.signOut(provider)
  }

  return { start, finish, key, cancel, logout, dispose: stopDevice }
}
