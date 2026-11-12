import type { BotRoster } from '@sand/bots/contract'
import type { Wire } from '@sand/devices-contract'
import type { InputOf } from '@sand/host-hub/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Threads } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import {
  loginAdd,
  loginChange,
  loginPick,
  loginRemove,
  loginsState,
  sourceConnect,
  sourceDisconnect,
  sourceSearch,
  type External,
  type Login,
  type LoginsState,
} from '../../contract'

export type NewLogin = InputOf<typeof loginAdd>

export type PickedLogin = InputOf<typeof loginPick>

export type LoginPatch = Omit<InputOf<typeof loginChange>, 'id'>

export const loginsModel = (wire: Wire) => {
  const state = sig<LoginsState | undefined>(undefined)

  const put = (login: Login) => {
    state.update(value => value && { ...value, logins: [...value.logins.filter(other => other.id !== login.id), login] })
    return login
  }

  const load = () => wire.call(loginsState, {}).then(value => state.set(value))

  const find = (id: string) => state.get()?.logins.find(login => login.id === id)

  const add = async (login: NewLogin) => put(await wire.call(loginAdd, login))

  const pick = async (login: PickedLogin) => put(await wire.call(loginPick, login))

  const change = async (id: string, patch: LoginPatch) => put(await wire.call(loginChange, { id, ...patch }))

  const remove = async (id: string) => state.set(await wire.call(loginRemove, { id }))

  const connect = async (source: External, secret: string) => state.set(await wire.call(sourceConnect, { source, secret }))

  const disconnect = async (source: External) => state.set(await wire.call(sourceDisconnect, { source }))

  const search = (source: External, query: string) => wire.call(sourceSearch, { source, query })

  return { state, load, find, add, pick, change, remove, connect, disconnect, search }
}

export type LoginsModel = ReturnType<typeof loginsModel>

export interface PageParts {
  kit: Kit
  wire: Wire
  threads(): Threads | undefined
  model: LoginsModel
  bots(): BotRoster | undefined
}
