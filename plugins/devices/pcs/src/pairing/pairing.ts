import type { ConnectionStatus, DeviceRecord, JoinRefusalReason, JoinTicket, PageLink, PagePairing } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import type { BrowserKeys } from '../keys'
import { askToJoin } from './join'
import { onPageLink, takePageLink } from './page-link'
import { pollJoin } from './poll'
import { redeemToken } from './redeem'

interface PairingOptions {
  keys: BrowserKeys
  reconnect(): void
  changed(): void
}

const joinRefused: Record<JoinRefusalReason, string> = {
  'not-private': 'This PC only takes join requests from home wifi or Tailscale.',
  'rate-limited': 'Too many join requests right now. Try again in a minute.',
  'already-paired': 'This browser is already paired. Reconnecting…',
}

export const createPairing = (options: PairingOptions) => {
  const { keys } = options
  let state: PagePairing = { phase: 'checking' }
  let approval: string | undefined
  let stopPolling: (() => void) | undefined

  const set = (next: PagePairing) => {
    if (JSON.stringify(next) === JSON.stringify(state)) return
    state = next
    options.changed()
  }

  const settle = (next: PagePairing) => {
    stopPolling?.()
    stopPolling = undefined
    set(next)
  }

  const paired = (device: DeviceRecord) => {
    settle({ phase: 'paired', device })
    options.reconnect()
  }

  const busy = () => state.phase === 'redeeming' || state.phase === 'requesting'

  const freshKey = () => {
    if (state.phase === 'removed') keys.renew()
  }

  const tryRedeem = async (token: string) => {
    const first = await redeemToken(token, keys.publicKey())
    if (first.ok || first.reason !== 'removed') return first
    keys.renew()
    return redeemToken(token, keys.publicKey())
  }

  const redeem = async (token: string) => {
    freshKey()
    settle({ phase: 'redeeming' })
    try {
      const redeemed = await tryRedeem(token)
      if (redeemed.ok) return paired(redeemed.device)
      set(redeemed.reason === 'removed' ? { phase: 'removed' } : { phase: 'unpaired', refused: redeemed.reason })
    } catch (error) {
      set({ phase: 'failed', error: errorMessage(error) })
    }
  }

  const fail = (message: string): never => {
    set({ phase: 'failed', error: message })
    throw new Error(message)
  }

  const requestJoin = async (): Promise<JoinTicket> => {
    freshKey()
    settle({ phase: 'checking' })
    const asked = await askToJoin(keys.publicKey()).catch((error: unknown) => fail(errorMessage(error)))
    if (!asked.ok) {
      if (asked.reason === 'already-paired') options.reconnect()
      return fail(joinRefused[asked.reason])
    }
    set({ phase: 'requesting', request: asked.ticket })
    stopPolling = pollJoin(asked.ticket, outcome => {
      stopPolling = undefined
      if (outcome.phase === 'approved') paired(outcome.device)
      else set({ phase: outcome.phase })
    })
    return asked.ticket
  }

  const open = (link: PageLink) => {
    if (link.kind === 'pair') return void redeem(link.token)
    approval = link.request
    options.changed()
  }

  const first = takePageLink()
  if (first) open(first)
  const stopLinks = onPageLink(open)

  return {
    state: () => state,
    self: () => (state.phase === 'paired' ? state.device.id : undefined),
    requestJoin,
    approval: () => approval,
    dismissApproval() {
      if (approval === undefined) return
      approval = undefined
      options.changed()
    },
    greeted(device: DeviceRecord | undefined) {
      if (device) settle({ phase: 'paired', device })
    },
    records(records: DeviceRecord[]) {
      if (state.phase !== 'paired') return
      const { id } = state.device
      const own = records.find(record => record.id === id)
      if (own && !own.removed) set({ phase: 'paired', device: own })
    },
    homeChanged(status: ConnectionStatus) {
      if (busy() || status.phase !== 'blocked') return
      if (status.reason === 'removed') return set({ phase: 'removed', ...(status.at && { at: status.at }), ...(status.by && { by: status.by }) })
      if (status.reason === 'not-paired' && (state.phase === 'checking' || state.phase === 'paired')) set({ phase: 'unpaired' })
    },
    close() {
      stopPolling?.()
      stopLinks()
    },
  }
}

export type Pairing = ReturnType<typeof createPairing>
