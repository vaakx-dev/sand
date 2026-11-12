import { addressParams, addressState, pushAddress, updateAddress } from '@sand/web-client/contract'
import { homeRoute, type Route } from './contract'

export interface Place {
  route: Route
  depth: number
}

const params = { kind: 'view', id: 'id', tab: 'tab' } as const

const depthKey = 'shellDepth'

export const sameScreen = (a: Route, b: Route) => a.kind === b.kind && a.id === b.id

export const screenKey = (route: Route) => `${route.kind}/${route.id ?? ''}`

const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

const routeOf = (value: Record<string, unknown>): Route[] => {
  const [kind, id, tab] = [text(value.kind), text(value.id), text(value.tab)]
  return kind ? [{ kind, ...(id !== undefined && { id }), ...(tab !== undefined && { tab }) }] : []
}

export const requestedPlace = (fallback: Route = { kind: homeRoute }): Place => {
  const { [params.kind]: kind, [params.id]: id, [params.tab]: tab } = addressParams()
  const [route = fallback] = routeOf({ kind, id, tab })
  const depth = addressState()[depthKey]
  return { route, depth: typeof depth === 'number' ? depth : 0 }
}

export const ownEntry = () => typeof addressState()[depthKey] === 'number'

export const samePlace = (a: Place, b: Place) => JSON.stringify(a) === JSON.stringify(b)

const urlOf = ({ kind, id, tab }: Route) => ({ [params.kind]: kind === homeRoute ? undefined : kind, [params.id]: id, [params.tab]: tab })

const stateOf = ({ depth }: Place) => ({ [depthKey]: depth })

export const recordPlace = (place: Place, replace: boolean) => {
  if (replace) updateAddress(urlOf(place.route), stateOf(place))
  else pushAddress({ ...addressParams(), ...urlOf(place.route) }, { ...addressState(), ...stateOf(place) })
}
