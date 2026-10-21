import { isRecord } from '@sand/util'

export const optionsOf = (table: unknown, id: string) => {
  const config = isRecord(table) ? table[id] : undefined
  const { enabled = true, ...options } = isRecord(config) ? config : {}
  return enabled === false ? undefined : options
}
