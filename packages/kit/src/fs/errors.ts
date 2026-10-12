import { isRecord } from '../json/record'

export const errorCode = (error: unknown) => (isRecord(error) && typeof error.code === 'string' ? error.code : undefined)

export const isMissing = (error: unknown) => {
  const code = errorCode(error)
  return code === 'ENOENT' || code === 'ENOTDIR'
}
