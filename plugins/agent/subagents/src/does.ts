import type { Role } from '@sand/model/contract'

const doings = ['find', 'build'] as const

type Does = (typeof doings)[number]

const DOES_ROLES: Record<Does, Role> = { find: 'finder', build: 'builder' }

export { doings, DOES_ROLES }
export type { Does }
