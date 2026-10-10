import { errorMessage } from '@sand/kit'
import type { GithubPending } from './contract'
import { deviceLogin, type DeviceLogin } from './gh/device'
import { ghToken } from './gh/login'

const codeLife = 15 * 60_000

interface FlowOptions {
  changed(): void
  signIn(token: string): Promise<void>
}

export const createFlow = ({ changed, signIn }: FlowOptions) => {
  let running: DeviceLogin | undefined
  let pending: GithubPending | undefined
  let error: string | undefined

  const finish = (flow: DeviceLogin) => {
    if (running !== flow) return
    running = undefined
    pending = undefined
    changed()
  }

  const watch = (flow: DeviceLogin) =>
    flow.done
      .then(async () => {
        if (running === flow) await signIn(await ghToken())
      })
      .catch(problem => {
        if (running === flow) error = errorMessage(problem)
      })
      .finally(() => finish(flow))

  return {
    pending: () => pending,
    error: () => error,
    async start() {
      if (running) return
      error = undefined
      let flow: DeviceLogin
      try {
        flow = running = deviceLogin()
      } catch (problem) {
        error = errorMessage(problem)
        return changed()
      }
      try {
        const code = await flow.code
        if (running !== flow) return
        pending = { ...code, expires: Date.now() + codeLife }
      } catch (problem) {
        if (running !== flow) return
        error = errorMessage(problem)
        return finish(flow)
      }
      changed()
      void watch(flow)
    },
    cancel() {
      running?.cancel()
      running = undefined
      pending = undefined
      error = undefined
    },
  }
}
