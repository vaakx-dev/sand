import { databaseFile, olderThanData, readUpgrade } from '@sand/ledger/contract'
import { isRecord } from '@sand/util'
import { readState, writeAtomic } from '@sand/util/fs'
import { readStamp } from '@sand/util/release'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { buildFolder, readPointer } from './layout'

export interface UpdateNotice {
  text: string
  at: number
}

export const updateNoticeFile = (home: string) => join(home, 'update-notice.json')

const parseNotice = (value: unknown): UpdateNotice | undefined =>
  isRecord(value) && typeof value.text === 'string' && typeof value.at === 'number' ? { text: value.text, at: value.at } : undefined

export const readUpdateNotice = (home: string) => readState(updateNoticeFile(home), parseNotice)

export const writeUpdateNotice = (home: string, text: string) => writeAtomic(updateNoticeFile(home), `${JSON.stringify({ text, at: Date.now() }, null, 2)}\n`)

export const clearUpdateNotice = (home: string) => rm(updateNoticeFile(home), { force: true })

export const previousBuild = async (home: string) => {
  const previous = await readPointer(home, 'previous')
  return previous ? readStamp(buildFolder(home, previous)) : undefined
}

export const rollbackBlocked = async (home: string) => {
  const previous = await previousBuild(home)
  return previous && olderThanData(previous, readUpgrade(databaseFile(home)))
}
