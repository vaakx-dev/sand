import type { DeviceRecord, JoinRequest } from '@sand/devices-contract'
import { sig } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'

export const deciding = (ui: Ui, request: () => JoinRequest, allowed?: (device: DeviceRecord) => void) => {
  const busy = sig(false)
  const run = async <T>(what: string, task: () => Promise<T>) => {
    busy.set(true)
    const done = await ui.toasts.attempt(what, task())
    busy.set(false)
    return done
  }
  return {
    busy,
    async allow() {
      const device = await run(`Couldn’t allow ${request().name}`, () => ui.data.requests.approve(request()))
      if (device) allowed?.(device)
    },
    deny: () => void run(`Couldn’t deny ${request().name}`, () => ui.data.requests.deny(request())),
  }
}
