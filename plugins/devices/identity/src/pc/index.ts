import type { KeyPair } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { deviceIdOf, generateKeyPair, isKeyPair } from '../keys'

export interface PcKeys extends KeyPair {
  id: string
}

export const pcIdentityFile = (home: string) => join(home, 'devices', 'identity.json')

const readKeys = async (file: string): Promise<KeyPair> => {
  const saved: unknown = await Bun.file(file)
    .json()
    .catch((error: unknown) => {
      throw new Error(`${file} is not valid JSON: ${errorMessage(error)}`)
    })
  if (!isKeyPair(saved)) throw new Error(`${file} does not hold a matching publicKey and secretKey`)
  return { publicKey: saved.publicKey, secretKey: saved.secretKey }
}

const createKeys = async (file: string) => {
  const keys = generateKeyPair()
  await mkdir(dirname(file), { recursive: true })
  await writePrivateJson(file, keys)
  return keys
}

export const loadPcIdentity = async (home: string): Promise<PcKeys> => {
  const file = pcIdentityFile(home)
  const keys = (await Bun.file(file).exists()) ? await readKeys(file) : await createKeys(file)
  return { id: deviceIdOf(keys.publicKey), ...keys }
}
