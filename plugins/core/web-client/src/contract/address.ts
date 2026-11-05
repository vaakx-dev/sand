import { listen } from '@vaakx-dev/vrui'
import { isRecord } from '@sand/util'

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

const layerKey = 'layer'

export const addressLayer = () => {
  const layer = addressState()[layerKey]
  return typeof layer === 'string' ? layer : undefined
}

const push = (state: AddressState, url: string | URL) => {
  if (addressLayer()) history.replaceState(state, '', url)
  else history.pushState(state, '', url)
}

export const pushLayer = (layer: string) => push({ ...addressState(), [layerKey]: layer }, location.href)

export const leaveLayer = () => {
  if (addressLayer()) history.back()
}

export const pushAddress = (params: AddressParams, state: AddressState) => {
  const { [layerKey]: _, ...page } = state
  push(page, urlOf(params))
}

export const updateAddress = (params: AddressParams, state: AddressState = {}) =>
  history.replaceState({ ...addressState(), ...state }, '', urlOf({ ...addressParams(), ...params }, location.hash))

export const onAddressChange = (changed: () => void) => listen(window, 'popstate', changed)
