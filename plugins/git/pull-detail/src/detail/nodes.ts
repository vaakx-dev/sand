import type { RawActor } from './raw'

export const present = <T>(nodes: readonly (T | null)[] | null | undefined): T[] => (nodes ?? []).filter((node): node is T => node !== null)

export const loginOf = (actor: RawActor | null) => actor?.login ?? 'ghost'

export const isBot = (actor: RawActor | null) => actor?.__typename === 'Bot' || (actor?.login.endsWith('[bot]') ?? false)
