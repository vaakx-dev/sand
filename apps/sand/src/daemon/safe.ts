import type { ServerInfo } from '@sand/protocol'
import { ask } from './ask'

const swapTimeout = 90_000

export const switchSafe = async (info: ServerInfo, on: boolean) => {
  const ok = await ask<boolean>(info, { type: 'runtimes.safe', on }, swapTimeout)
  if (!ok) throw new Error(`sand could not ${on ? 'switch to' : 'leave'} safe mode; see the page or server.log`)
}
