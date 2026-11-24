import { isRecord } from '@sand/util'

type Json = Record<string, unknown>

const fieldsOf = (value: unknown): Json => (isRecord(value) ? value : {})

const textOf = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

export { fieldsOf, textOf, type Json }
