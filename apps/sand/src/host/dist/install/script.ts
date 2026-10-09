import type { HostBuild, HttpRoute } from '@sand/protocol'
import type { InstallKeys } from '../installs'
import type { InstallScript } from '../scripts/options'
import { expiredMessage, installSecret, scriptBase } from './base'

export interface ScriptRouteDeps {
  installs: Pick<InstallKeys, 'check' | 'step'>
  build: Pick<HostBuild, 'info'>
  name: string
}

const reply = (body: string, contentType: string) =>
  new Response(body, { headers: { 'content-type': contentType, 'cache-control': 'no-store' } })

export const scriptRoute = (script: InstallScript, { installs, build, name }: ScriptRouteDeps): HttpRoute => ({
  method: 'GET',
  async handle(call) {
    const secret = installSecret(call)
    if (!secret || !installs.check(secret)) return reply(script.refuse(`${expiredMessage}. Copy a new command from Add a PC on ${name}.`), script.contentType)
    const { id } = await build.info()
    installs.step(secret, 'connected')
    return reply(script.render({ base: scriptBase(call), secret, from: name, build: id, bun: Bun.version }), script.contentType)
  },
})
