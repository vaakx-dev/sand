import { isRecord } from '@sand/util'

export type Json = Record<string, unknown>

export const fieldsOf = (value: unknown): Json => (isRecord(value) ? value : {})

export const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0
