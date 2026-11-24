import { efforts, type Effort } from '@sand/accounts/contract'

interface Levels {
  efforts?: Effort[]
  defaultEffort?: Effort
}

const levelsOf = (offered: unknown[], current?: unknown): Levels => {
  const names = new Set(offered.flatMap(value => (typeof value === 'string' ? [value.toLowerCase()] : [])))
  const supported = efforts.filter(effort => names.has(effort))
  const defaultEffort = typeof current === 'string' ? supported.find(effort => effort === current.toLowerCase()) : undefined
  return { ...(supported.length && { efforts: supported }), ...(defaultEffort && { defaultEffort }) }
}

export { levelsOf, type Levels }
