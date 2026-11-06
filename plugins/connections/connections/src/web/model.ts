import type { Wire } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import {
  type Account,
  connectionCancel,
  connectionClient,
  connectionRemove,
  connectionSave,
  connectionStart,
  connectionState,
  type ConnectionState,
  type FlowEnd,
} from '../contract'
import { blankTab, showIn } from './tab'

export const connectionsModel = (wire: Wire) => {
  const state = sig<ConnectionState | undefined>(undefined)
  const open = sig<string | undefined>(undefined)
  const flow = sig<{ id: string; url: string } | undefined>(undefined)
  const error = sig('')
  const busy = sig(false)

  const load = () => wire.call(connectionState, {}).then(value => state.set(value))

  const run = async (work: () => Promise<unknown>) => {
    busy.set(true)
    error.set('')
    try {
      await work()
      return true
    } catch (failure) {
      error.set(errorMessage(failure))
      return false
    } finally {
      busy.set(false)
    }
  }

  const cancel = () => {
    const running = flow.get()
    if (!running) return
    flow.set(undefined)
    void wire.call(connectionCancel, { flow: running.id })
  }

  const choose = (kind: string | undefined) => {
    cancel()
    error.set('')
    open.set(kind)
  }

  const connect = async (kind: string, readOnly: boolean) => {
    const tab = blankTab()
    const started = await run(async () => {
      const { flow: id, url } = await wire.call(connectionStart, { kind, readOnly })
      flow.set({ id, url })
      showIn(tab, url)
    })
    if (!started) tab?.close()
  }

  const ended = (end: FlowEnd) => {
    if (end.flow !== flow.get()?.id) return
    flow.set(undefined)
    if (end.error) error.set(end.error)
    else open.set(undefined)
  }

  const reconnect = (account: Account) => {
    choose(account.kind)
    const kind = state.get()?.kinds.find(item => item.id === account.kind)
    if (kind?.method === 'oauth' && kind.client) void connect(kind.id, account.readOnly)
  }

  const saveClient = (kind: string, id: string, secret: string) =>
    run(async () => state.set(await wire.call(connectionClient, { kind, id, ...(secret && { secret }) })))

  const saveForm = (kind: string, values: Record<string, string>) =>
    run(async () => {
      await wire.call(connectionSave, { kind, values })
      open.set(undefined)
    })

  const remove = (account: string) => run(async () => state.set(await wire.call(connectionRemove, { account })))

  return { state, open, flow, error, busy, load, choose, connect, cancel, ended, reconnect, saveClient, saveForm, remove }
}

export type ConnectionsModel = ReturnType<typeof connectionsModel>
