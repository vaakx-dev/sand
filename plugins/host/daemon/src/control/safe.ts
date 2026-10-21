import type { ServerInfo } from '@sand/host-gateway/contract'
import { runtimesSafe } from '@sand/host-runtimes/contract'
import { ask } from './ask'

const swapTimeout = 90_000

export const switchSafe = async (info: ServerInfo, on: boolean) => {
  const ok = await ask(info, runtimesSafe, { on }, swapTimeout)
  if (!ok) throw new Error(`sand could not ${on ? 'switch to' : 'leave'} safe mode; see the page or server.log`)
}
