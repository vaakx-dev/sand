import { randomSecret } from '@sand/util/fs'
import { z } from 'zod'
import type { AskpassProgram } from './program'

export type Asker = (text: string, kind: string) => Promise<string | null>

const askSchema = z.object({ text: z.string().max(4000), kind: z.string().max(40) })

export const openBridge = (program: AskpassProgram) => {
  const askers = new Map<string, Asker>()

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    idleTimeout: 0,
    async fetch(request) {
      const asker = askers.get(new URL(request.url).pathname.slice(1))
      if (request.method !== 'POST' || !asker) return new Response(null, { status: 404 })
      const parsed = askSchema.safeParse(await request.json().catch(() => undefined))
      if (!parsed.success) return new Response(null, { status: 400 })
      const value = await asker(parsed.data.text, parsed.data.kind)
      return value === null ? new Response(null, { status: 410 }) : new Response(value)
    },
  })

  const register = (asker: Asker) => {
    const token = randomSecret()
    askers.set(token, asker)
    const env = {
      ...program,
      SSH_ASKPASS_REQUIRE: 'force',
      DISPLAY: process.env.DISPLAY || 'sand:0',
      SAND_SSH_ASK: new URL(token, server.url).href,
    }
    return { env, dispose: () => void askers.delete(token) }
  }

  return { register, stop: () => void server.stop(true) }
}

export type Bridge = ReturnType<typeof openBridge>
