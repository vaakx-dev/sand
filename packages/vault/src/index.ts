import { chmod, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ivBytes = 12
const keyBytes = 32

export type Keychain = typeof Bun.secrets

const keychainEntry = (name: string, home: string) => ({ service: 'sand', name: `${name} ${home}` })

const fromKeychain = async (keychain: Keychain, entry: ReturnType<typeof keychainEntry>) => {
  try {
    const found = await keychain.get(entry)
    return { found: found ? Buffer.from(found, 'base64') : undefined, usable: true }
  } catch {
    return { found: undefined, usable: false }
  }
}

const intoKeychain = async (keychain: Keychain, entry: ReturnType<typeof keychainEntry>, key: Uint8Array) => {
  try {
    await keychain.set({ ...entry, value: Buffer.from(key).toString('base64') })
    return true
  } catch {
    return false
  }
}

const writeKeyFile = async (path: string, key: Uint8Array) => {
  await writeFile(path, Buffer.from(key).toString('base64'), { mode: 0o600 })
  await chmod(path, 0o600)
}

const importKey = (raw: BufferSource) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])

export const openVault = async <T>(home: string, name: string, keychain: Keychain | undefined) => {
  const path = join(home, `${name}.vault`)
  const keyPath = join(home, `${name}.key`)
  const entry = keychainEntry(name, home)
  const keyFile = Bun.file(keyPath)
  const stored = keychain ? await fromKeychain(keychain, entry) : { found: undefined, usable: false }
  const filed = !stored.found && (await keyFile.exists()) ? Buffer.from(await keyFile.text(), 'base64') : undefined
  const raw = stored.found ?? filed
  if (!raw && (await Bun.file(path).exists())) throw new Error(`Can't open ${path}: its key is in neither the system keychain nor ${name}.key`)
  let key = raw && (await importKey(raw))
  let inKeychain = raw ? Boolean(stored.found) : stored.usable

  const create = async () => {
    const fresh = crypto.getRandomValues(new Uint8Array(keyBytes))
    inKeychain = Boolean(keychain && inKeychain && (await intoKeychain(keychain, entry, fresh)))
    if (!inKeychain) await writeKeyFile(keyPath, fresh)
    return importKey(fresh)
  }

  const clear = async () => {
    if (!key) return
    await rm(path, { force: true })
    if (keychain && inKeychain) await keychain.delete(entry)
    else await rm(keyPath, { force: true })
    inKeychain = stored.usable
    key = undefined
  }

  const read = async (): Promise<T | undefined> => {
    const file = Bun.file(path)
    if (!key || !(await file.exists())) return undefined
    const bytes = new Uint8Array(await file.arrayBuffer())
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, ivBytes) }, key, bytes.subarray(ivBytes))
    return JSON.parse(new TextDecoder().decode(plain))
  }

  const write = async (data: T) => {
    key ??= await create()
    const iv = crypto.getRandomValues(new Uint8Array(ivBytes))
    const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data))))
    const temp = `${path}.${crypto.randomUUID()}`
    await writeFile(temp, Buffer.concat([iv, sealed]), { mode: 0o600 })
    await rename(temp, path)
  }

  return { keychain: () => inKeychain, read, write, clear }
}

export type Vault<T> = Awaited<ReturnType<typeof openVault<T>>>
