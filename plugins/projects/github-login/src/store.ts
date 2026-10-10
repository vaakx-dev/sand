import { writePrivateJson } from '@sand/kit/fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface SignedIn {
  login: string
  token: string
  at: number
  from?: { id: string; name: string }
}

export interface SignedOut {
  out: number
}

export type GithubRecord = SignedIn | SignedOut

const key = 'github'

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0

const time = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const placeOf = (value: any) => (text(value?.id) && text(value?.name) ? { id: value.id, name: value.name } : undefined)

export const recordOf = (value: any): GithubRecord | undefined => {
  if (time(value?.out)) return { out: value.out }
  if (!text(value?.login) || !text(value.token) || !time(value.at)) return undefined
  const from = placeOf(value.from)
  return { login: value.login, token: value.token, at: value.at, ...(from && { from }) }
}

export const isSignedIn = (record: GithubRecord | undefined): record is SignedIn => !!record && 'login' in record

export const timeOf = (record: GithubRecord | undefined) => (!record ? 0 : isSignedIn(record) ? record.at : record.out)

export const authFile = async (home: string) => {
  const own = join(home, 'auth.json')
  return (await Bun.file(own).exists()) ? own : join(homedir(), '.sand', 'auth.json')
}

const readAll = async (path: string): Promise<Record<string, unknown>> => {
  const file = Bun.file(path)
  if (!(await file.exists())) return {}
  const json = await file.json()
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error(`${path} is not a JSON object`)
  return json
}

export const githubStore = (path: string) => {
  let writing = Promise.resolve()
  return {
    read: async () => recordOf((await readAll(path).catch((): Record<string, unknown> => ({})))[key]),
    write(record: GithubRecord) {
      writing = writing.catch(() => {}).then(async () => writePrivateJson(path, { ...(await readAll(path)), [key]: record }))
      return writing
    },
  }
}

export type GithubStore = ReturnType<typeof githubStore>
