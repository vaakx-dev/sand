import type { KeyPair } from '@sand/devices-contract'
import { readState, writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { deviceIdOf, generateKeyPair, isKeyPair, keysMatch } from '../keys'

export interface PcKeys extends KeyPair {
  id: string
}

export const pcIdentityFile = (home: string) => join(home, 'devices', 'identity.json')

const keysOf = (saved: unknown): KeyPair | undefined =>
  isKeyPair(saved) && keysMatch(saved) ? { publicKey: saved.publicKey, secretKey: saved.secretKey } : undefined

const createKeys = async (file: string) => {
  const keys = generateKeyPair()
  await mkdir(dirname(file), { recursive: true })
  await writePrivateJson(file, keys)
  return keys
}

export const loadPcIdentity = async (home: string): Promise<PcKeys> => {
  const file = pcIdentityFile(home)
  const keys = (await readState(file, keysOf)) ?? (await createKeys(file))
  return { id: deviceIdOf(keys.publicKey), ...keys }
}
