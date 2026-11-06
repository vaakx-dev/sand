import { chmod, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Account, Client } from './contract'

export interface Tokens {
  access: string
  refresh?: string
  expires?: number
}

export type Secret = { tokens: Tokens; client: Client } | { values: Record<string, string> }

export type Entry = { account: Account } & Secret

export interface Data {
  entries: Entry[]
  clients: Record<string, Client>
}

const ivBytes = 12
const keyBytes = 32

const keychainEntry = (home: string) => ({ service: 'sand', name: `connections ${home}` })

export type Keychain = typeof Bun.secrets

const fromKeychain = async (keychain: Keychain, home: string) => {
  try {
    const found = await keychain.get(keychainEntry(home))
    return { found: found ? Buffer.from(found, 'base64') : undefined, usable: true }
  } catch {
    return { found: undefined, usable: false }
  }
}

const intoKeychain = async (keychain: Keychain, home: string, key: Uint8Array) => {
  try {
    await keychain.set({ ...keychainEntry(home), value: Buffer.from(key).toString('base64') })
    return true
  } catch {
    return false
  }
}

const writeKeyFile = async (path: string, key: Uint8Array) => {
  await writeFile(path, Buffer.from(key).toString('base64'), { mode: 0o600 })
  await chmod(path, 0o600)
}

const isEmpty = (data: Data) => !data.entries.length && !Object.keys(data.clients).length

const importKey = (raw: BufferSource) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])

export const openVault = async (home: string, keychain: Keychain | undefined) => {
  const path = join(home, 'connections.vault')
  const keyPath = join(home, 'connections.key')
  const keyFile = Bun.file(keyPath)
  const stored = keychain ? await fromKeychain(keychain, home) : { found: undefined, usable: false }
  const filed = !stored.found && (await keyFile.exists()) ? Buffer.from(await keyFile.text(), 'base64') : undefined
  const raw = stored.found ?? filed
  if (!raw && (await Bun.file(path).exists())) throw new Error(`Can't open ${path}: its key is in neither the system keychain nor connections.key`)
  let key = raw && (await importKey(raw))
  let inKeychain = raw ? Boolean(stored.found) : stored.usable

  const create = async () => {
    const fresh = crypto.getRandomValues(new Uint8Array(keyBytes))
    inKeychain = Boolean(keychain && inKeychain && (await intoKeychain(keychain, home, fresh)))
    if (!inKeychain) await writeKeyFile(keyPath, fresh)
    return importKey(fresh)
  }

  const forget = async () => {
    await rm(path, { force: true })
    if (keychain && inKeychain) await keychain.delete(keychainEntry(home))
    else await rm(keyPath, { force: true })
    inKeychain = stored.usable
    key = undefined
  }

  const read = async (): Promise<Data> => {
    const file = Bun.file(path)
    if (!key || !(await file.exists())) return { entries: [], clients: {} }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, ivBytes) }, key, bytes.subarray(ivBytes))
    return JSON.parse(new TextDecoder().decode(plain))
  }

  const write = async (data: Data) => {
    if (isEmpty(data)) return key && forget()
    key ??= await create()
    const iv = crypto.getRandomValues(new Uint8Array(ivBytes))
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data))))
    const temp = `${path}.${crypto.randomUUID()}`
    await writeFile(temp, Buffer.concat([iv, sealed]), { mode: 0o600 })
    await rename(temp, path)
  }

  return { keychain: () => inKeychain, read, write }
}

export type Vault = Awaited<ReturnType<typeof openVault>>
