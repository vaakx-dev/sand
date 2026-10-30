import { connect, directTransport, type ViaRelay, viaTransport } from '@sand/devices-connect'
import type { DeviceRecord, PcConnection, Route, RouteStore, Signer, WakeSource } from '@sand/devices-contract'
import type { Hello } from '@sand/host-hub/contract'
import { pinnedKey } from './seeds'

export interface PeerLink {
  record: DeviceRecord
  readonly key: string
  readonly connection: PcConnection
  hello(): Hello | undefined
  open(): boolean
}

export interface LinkSetup {
  signer: Signer
  wake: WakeSource
  store: RouteStore
  relay(through: string): ViaRelay
  event(pc: string, name: string, payload: unknown): void
  opened(pc: string): void
  changed(pc: string): void
}

export const openPeerLink = (record: DeviceRecord, seeds: Route[], key: string, setup: LinkSetup): PeerLink => {
  let connection: PcConnection | undefined
  let hello: Hello | undefined
  let open = false

  connection = connect({
    target: { id: record.id, name: record.name, publicKey: pinnedKey(record) },
    seeds,
    signer: setup.signer,
    transports: { direct: directTransport, via: through => viaTransport(setup.relay(through), record.id) },
    wake: setup.wake,
    store: setup.store,
    secure: false,
    visible: () => true,
    greeting: () => ({ since: null }),
    greeted(reply) {
      hello = reply
      const fresh = !open
      open = true
      setup.changed(record.id)
      if (fresh) setup.opened(record.id)
    },
    event: (name, payload) => setup.event(record.id, name, payload),
    changed() {
      if (open && connection?.status().phase !== 'connected') {
        open = false
        hello = undefined
      }
      setup.changed(record.id)
    },
  })

  return { record, key, connection, hello: () => hello, open: () => open }
}
