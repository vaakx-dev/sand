import { type PairLink, pairCancel, pairLink } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { derive, effect, onTimeout, sig, untrack } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'

const renewMargin = 30_000
const minRenew = 30_000

export const livePairLink = (ui: Ui, kind: 'device' | 'pc') => {
  const link = sig<PairLink | undefined>(undefined)
  const error = sig('')
  const renewals = sig(0)
  const { home } = ui.data
  const routes = derive(() => JSON.stringify([home.network.value.get()?.routes, home.tailscale.value.get()?.httpsUrl]))

  const cancel = (token: string) => void ui.toasts.attempt('Couldn’t cancel the old link', ui.ctx.wire.call(pairCancel, { token }))

  const create = async () => {
    const before = untrack(() => link.get())
    try {
      link.set(await ui.ctx.wire.call(pairLink, { kind }))
      error.set('')
    } catch (failure) {
      error.set(errorMessage(failure))
    }
    if (before) cancel(before.token)
  }

  effect(() => {
    routes.get()
    renewals.get()
    untrack(() => void create())
  })
  effect(() => {
    const current = link.get()
    if (current) return onTimeout(() => renewals.update(count => count + 1), Math.max(current.expires - Date.now() - renewMargin, minRenew))
  })
  effect(() => () => {
    const last = untrack(() => link.get())
    if (last) cancel(last.token)
  })

  return { link, error, retry: () => renewals.update(count => count + 1), used: () => link.set(undefined) }
}
