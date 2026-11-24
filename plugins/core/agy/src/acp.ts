import { type Json, startRpc } from '@sand/app-plan'
import { acpArgs, agy } from './binary'

interface AcpOptions {
  folder?: string
  agent?: string
  cwd?: string
  onNotify?(method: string, params: Json): void
  onRequest?(method: string, params: Json): Promise<unknown>
  onExit?(error: Error): void
}

type AcpClient = Awaited<ReturnType<typeof startAcp>>

const ACP_VERSION = 1

const refused = async (method: string) => {
  throw new Error(`sand doesn't handle ${method}`)
}

async function startAcp({ folder, agent, cwd, onNotify, onRequest, onExit }: AcpOptions) {
  const client = startRpc({
    command: [await agy.require(), ...acpArgs({ folder, agent })],
    app: agy.app,
    cwd,
    onNotify: onNotify ?? (() => {}),
    onRequest: onRequest ?? refused,
    onExit: onExit ?? (() => {}),
  })
  const init = await client.request('initialize', { protocolVersion: ACP_VERSION, clientCapabilities: {} }).catch(async error => {
    await client.close()
    throw error
  })
  return { ...client, init }
}

async function withAcp<T>(folder: string | undefined, run: (client: AcpClient) => Promise<T>): Promise<T> {
  const client = await startAcp({ folder })
  try {
    return await run(client)
  } finally {
    await client.close()
  }
}

export { startAcp, withAcp }
export type { AcpClient }
