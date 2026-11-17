import { z } from 'zod'

const table = z.record(z.string(), z.unknown()).catch({})

export const optionsOf = (plugins: unknown, id: string) => {
  const { enabled = true, ...options } = table.parse(table.parse(plugins)[id])
  return enabled === false ? undefined : options
}
