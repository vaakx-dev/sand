import { encodeBase64url } from '@sand/devices-identity'
import { writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { z } from 'zod'

const algorithm = { name: 'ECDSA', namedCurve: 'P-256' }
const contact = 'https://github.com/vaakx-dev/sand'
const lifetime = 12 * 60 * 60
const text = new TextEncoder()

const savedSchema = z.object({
  publicKey: z.string().min(1),
  privateKey: z.object({ kty: z.literal('EC'), crv: z.literal('P-256'), x: z.string(), y: z.string(), d: z.string() }),
})

type Saved = z.infer<typeof savedSchema>

const vapidFile = (home: string) => join(home, 'notify', 'vapid.json')

const create = async (file: string): Promise<Saved> => {
  const pair = await crypto.subtle.generateKey(algorithm, true, ['sign', 'verify'])
  const publicKey = encodeBase64url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)))
  const saved = savedSchema.parse({ publicKey, privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey) })
  await mkdir(dirname(file), { recursive: true })
  await writePrivateJson(file, saved)
  return saved
}

const load = async (file: string) => ((await Bun.file(file).exists()) ? savedSchema.parse(await Bun.file(file).json()) : create(file))

const part = (value: object) => encodeBase64url(text.encode(JSON.stringify(value)))

export const loadVapid = async (home: string) => {
  const { publicKey, privateKey } = await load(vapidFile(home))
  const key = await crypto.subtle.importKey('jwk', privateKey, algorithm, false, ['sign'])

  const authorization = async (endpoint: string) => {
    const claims = { aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + lifetime, sub: contact }
    const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part(claims)}`
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, text.encode(unsigned))
    return `vapid t=${unsigned}.${encodeBase64url(new Uint8Array(signature))}, k=${publicKey}`
  }

  return { publicKey, authorization }
}

export type Vapid = Awaited<ReturnType<typeof loadVapid>>
