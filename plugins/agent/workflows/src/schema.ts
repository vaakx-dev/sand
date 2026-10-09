import { errorMessage } from '@sand/kit'
import { z } from 'zod'

export type Schema = z.ZodType | Record<string, unknown>

const isZod = (schema: Schema): schema is z.ZodType => schema instanceof z.ZodType

export const jsonSchema = (schema: Schema) => (isZod(schema) ? z.toJSONSchema(schema) : schema)

const extract = (text: string) => {
  const blocks = [...text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)]
  const block = blocks.at(-1)?.[1]
  if (block) return block
  const start = text.search(/[[{]/)
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
  return start >= 0 && end > start ? text.slice(start, end + 1) : text
}

export const parseOutput = (schema: Schema, text: string): { ok: true; value: unknown } | { ok: false; error: string } => {
  let value: unknown
  try {
    value = JSON.parse(extract(text))
  } catch (error) {
    return { ok: false, error: `not valid JSON (${errorMessage(error)})` }
  }
  if (!isZod(schema)) return { ok: true, value }
  const parsed = schema.safeParse(value)
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: z.prettifyError(parsed.error) }
}
