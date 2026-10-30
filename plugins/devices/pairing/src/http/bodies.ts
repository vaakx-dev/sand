import { deviceKindSchema } from '@sand/devices-contract'
import { decodeBase64url } from '@sand/devices-identity'
import { readJson } from '@sand/util/host'
import { z } from 'zod'

const bodyLimit = 8192
const publicKeyBytes = 32

const isPublicKey = (value: string) => {
  try {
    return decodeBase64url(value).length === publicKeyBytes
  } catch {
    return false
  }
}

const device = {
  publicKey: z.string().max(128).refine(isPublicKey, 'not an ed25519 public key'),
  name: z.string().max(200),
  kind: deviceKindSchema,
  platform: z.string().max(80),
}

export const joinBodySchema = z.object(device)

export const cancelBodySchema = z.object({ id: z.string().min(1).max(256) })

export const pairBodySchema = z.object({ token: z.string().min(1).max(256), ...device })

export const readBody = async <T>(request: Request, schema: z.ZodType<T>) => {
  const parsed = schema.safeParse(await readJson(request, bodyLimit))
  return parsed.success ? parsed.data : undefined
}
