import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { SnapshotRepo } from './repo'

export type IndexEnv = Record<string, string>

export const withTempIndex = async <T>(repo: SnapshotRepo, work: (env: IndexEnv) => Promise<T>): Promise<T> => {
  const temp = join(tmpdir(), `sand-snapshot-${crypto.randomUUID()}.index`)
  try {
    const index = Bun.file(repo.index)
    if (await index.exists()) await Bun.write(temp, index)
    return await work({ GIT_INDEX_FILE: temp, GIT_LITERAL_PATHSPECS: '1' })
  } finally {
    await Promise.all([rm(temp, { force: true }), rm(`${temp}.lock`, { force: true })])
  }
}
