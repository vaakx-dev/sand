import { errorCode } from '@sand/util/fs'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const create = (path: string) => {
  try {
    writeFileSync(path, crypto.getRandomValues(new Uint8Array(32)), { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if (errorCode(error) !== 'EEXIST') throw error
  }
}

export const loadKey = (path: string): Uint8Array => {
  if (!existsSync(path)) create(path)
  return readFileSync(path)
}
