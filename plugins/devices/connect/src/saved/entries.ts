import { lazy } from '@sand/util'
import { z } from 'zod'

const entriesSchema = lazy(() => z.record(z.string(), z.unknown()))

const validEntries = <T>(saved: unknown, schema: z.ZodType<T>): Record<string, T> => {
  const entries = Object.entries(entriesSchema().safeParse(saved).data ?? {})
  return Object.fromEntries(
    entries.flatMap(([key, value]): [string, T][] => {
      const { data } = schema.safeParse(value)
      return data === undefined ? [] : [[key, data]]
    }),
  )
}

export { validEntries }
