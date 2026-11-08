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

let waiting: (() => void)[] | undefined
let covered: { href: string; restore: () => void } | undefined

const settle = () => {
  if (covered && !addressLayer() && location.href === covered.href) covered.restore()
  covered = undefined
  const changes = waiting ?? []
  waiting = undefined
  for (const change of changes) change()
}

const write = (change: () => void) => {
  if (waiting) return void waiting.push(change)
  if (!addressLayer()) return change()
  waiting = [change]
  listen(window, 'popstate', settle, { once: true })
  history.back()
}

const layered = (layer: string) => ({ ...addressState(), [layerKey]: layer })

export const addressSettled = () => !waiting

export const pushLayer = (layer: string) => {
  if (!waiting && addressLayer()) return history.replaceState(layered(layer), '', location.href)
  write(() => history.pushState(layered(layer), '', location.href))
}

export const leaveLayer = () => {
  if (waiting || !addressLayer()) return
  waiting = []
  listen(window, 'popstate', settle, { once: true })
  history.back()
}

export const pushAddress = (params: AddressParams, state: AddressState) => {
  const { [layerKey]: _, ...page } = state
  write(() => history.pushState(page, '', urlOf(params)))
}

export const updateAddress = (params: AddressParams, state: AddressState = {}) => {
  const change = () => history.replaceState({ ...addressState(), ...state }, '', urlOf({ ...addressParams(), ...params }, location.hash))
  if (waiting) return void waiting.push(change)
  if (!addressLayer()) return change()
  const href = covered?.href ?? location.href
  change()
  const { [layerKey]: _, ...page } = addressState()
  const url = location.href
  covered = { href, restore: () => history.replaceState(page, '', url) }
}

export const backAddress = (steps = 1) => history.go(-(addressLayer() ? steps + 1 : steps))

export const forwardAddress = () => history.forward()

export const onAddressChange = (changed: () => void) =>
  listen(window, 'popstate', () => {
    settle()
    changed()
  })
