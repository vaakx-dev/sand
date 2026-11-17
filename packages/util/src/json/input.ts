import { oneLine } from '../text/line'
import { z } from 'zod'

const BRIEF_LENGTH = 200

const fields = z.record(z.string(), z.unknown())

const name = z.string().min(1).optional().catch(undefined)

const names = z.object({ label: name, title: name })

const brief = (value: string) => value.length <= BRIEF_LENGTH && !value.includes('\n')

const leaves = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(leaves)
  const record = fields.safeParse(value)
  if (record.success) return Object.values(record.data).flatMap(leaves)
  if (value === null || value === undefined) return []
  return [String(value)]
}

const named = (input: unknown) => {
  const found = names.safeParse(input).data
  return found?.label ?? found?.title
}

const inputText = (input: unknown, max?: number) => {
  const all = leaves(input)
  const short = all.filter(brief)
  return oneLine(named(input) ?? (short.length ? short : all).join(' '), max)
}

export { inputText }
