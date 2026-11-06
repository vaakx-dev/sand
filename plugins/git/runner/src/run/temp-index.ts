import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { GitEnv } from '../contract'
import { gitOk } from './run'

const indexPath = ['rev-parse', '--path-format=absolute', '--git-path', 'index']

const copyIndex = async (cwd: string, to: string) => {
  const index = Bun.file(await gitOk(cwd, indexPath, { read: true }))
  if (await index.exists()) await Bun.write(to, index)
}

export const withTempIndex = async <T>(cwd: string, run: (env: GitEnv) => Promise<T>): Promise<T> => {
  const temp = join(tmpdir(), `sand-git-${crypto.randomUUID()}.index`)
  try {
    await copyIndex(cwd, temp)
    return await run({ GIT_INDEX_FILE: temp })
  } finally {
    await Promise.all([rm(temp, { force: true }), rm(`${temp}.lock`, { force: true })])
  }
}
