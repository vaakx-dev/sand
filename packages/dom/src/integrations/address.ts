import { isRecord } from '@sand/kit'
import { listen } from '@vaakx-dev/vrui'

type AddressParams = Record<string, string | undefined>
type AddressState = Record<string, unknown>

const urlOf = (params: AddressParams, hash = '') => {
  const url = new URL(location.pathname + hash, location.href)
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value)
  return url
}

export const addressParams = (): AddressParams => Object.fromEntries(new URLSearchParams(location.search))

export const addressParam = (key: string) => addressParams()[key]

export const addressState = (): AddressState => (isRecord(history.state) ? history.state : {})

export const pushAddress = (params: AddressParams, state: AddressState) => history.pushState(state, '', urlOf(params))

export const updateAddress = (params: AddressParams, state: AddressState = {}) =>
  history.replaceState({ ...addressState(), ...state }, '', urlOf({ ...addressParams(), ...params }, location.hash))

export const onAddressChange = (changed: () => void) => listen(window, 'popstate', changed)
