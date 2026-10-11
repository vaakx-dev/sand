import { isRecord } from '@sand/kit'

export type Json = Record<string, unknown>

export const fieldsOf = (value: unknown): Json => (isRecord(value) ? value : {})

export const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0

export const jwtClaims = (token: unknown): Json => {
  const payload = typeof token === 'string' ? token.split('.')[1] : undefined
  if (!payload) return {}
  try {
    return fieldsOf(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')))
  } catch {
    return {}
  }
}
