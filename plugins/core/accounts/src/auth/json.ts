import { z } from 'zod'

export type Json = Record<string, unknown>

const fields = z.record(z.string(), z.unknown())

export const fieldsOf = (value: unknown): Json => fields.catch({}).parse(value)

export const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0
