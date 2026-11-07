import type { Wire } from '@sand/devices-contract'
import type { InputOf } from '@sand/host-hub/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Threads } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { loginAdd, loginChange, loginRemove, loginsState, type Login, type LoginsState } from '../../contract'

export type NewLogin = InputOf<typeof loginAdd>

export type LoginPatch = Omit<InputOf<typeof loginChange>, 'id'>

export const loginsModel = (wire: Wire) => {
  const state = sig<LoginsState | undefined>(undefined)

  const put = (login: Login) =>
    state.update(value => value && { ...value, logins: [...value.logins.filter(other => other.id !== login.id), login] })

  const load = () => wire.call(loginsState, {}).then(value => state.set(value))

  const find = (id: string) => state.get()?.logins.find(login => login.id === id)

  const add = async (login: NewLogin) => {
    const added = await wire.call(loginAdd, login)
    put(added)
    return added
  }

  const change = async (id: string, patch: LoginPatch) => put(await wire.call(loginChange, { id, ...patch }))

  const remove = async (id: string) => state.set(await wire.call(loginRemove, { id }))

  return { state, load, find, add, change, remove }
}

export type LoginsModel = ReturnType<typeof loginsModel>

export interface PageParts {
  kit: Kit
  wire: Wire
  threads: Threads
  model: LoginsModel
}
