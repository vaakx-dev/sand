import { isRecord } from '@sand/kit'

export const inputText = (input: unknown, key: string) => {
  const value = isRecord(input) ? input[key] : undefined
  return typeof value === 'string' ? value : ''
}
