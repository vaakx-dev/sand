import type { PcRoutes, PublishedRoute, Route } from '@sand/devices-contract'
import { isRecord } from '@sand/util'

const routeKinds = ['local', 'lan', 'tailscale', 'via']
const directKinds = ['local', 'lan', 'tailscale']
const routeSources = ['published', 'seed', 'added']

const oneOf = (list: string[], value: unknown) => typeof value === 'string' && list.includes(value)

const optionalText = (value: unknown) => value === undefined || typeof value === 'string'

const isKeys = (value: unknown): value is string[] => Array.isArray(value) && value.every(key => typeof key === 'string')

const isRoute = (value: unknown): value is Route =>
  isRecord(value) &&
  typeof value.key === 'string' &&
  oneOf(routeKinds, value.kind) &&
  oneOf(routeSources, value.source) &&
  optionalText(value.url) &&
  optionalText(value.via)

export const isPcRoutes = (value: unknown): value is PcRoutes =>
  isRecord(value) &&
  Array.isArray(value.routes) &&
  value.routes.every(isRoute) &&
  isRecord(value.prefs) &&
  isKeys(value.prefs.order) &&
  isKeys(value.prefs.disabled)

export const isPublishedRoutes = (value: unknown): value is PublishedRoute[] =>
  Array.isArray(value) && value.every(route => isRecord(route) && typeof route.url === 'string' && oneOf(directKinds, route.kind))
