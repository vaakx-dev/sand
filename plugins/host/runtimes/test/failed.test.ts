import { runtimeEnv } from '@sand/boot'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { FailedPlugin, HostMessage, RuntimeMessage } from '../src/contract'

const MAIN = resolve(import.meta.dir, '..', '..', '..', '..', 'apps', 'sand', 'src', 'main.ts')
const SETTINGS = '[host]\nport = 0\n\n[plugins.devices-network]\nenabled = false\n'

let home: string
let failed: FailedPlugin[]

const writePlugin = async (name: string, apply: string) => {
  const dir = join(home, 'plugins', name)
  await Bun.write(join(dir, 'package.json'), JSON.stringify({ name, type: 'module', sand: { runtime: './index.ts' } }))
  await Bun.write(join(dir, 'index.ts'), `export default { name: '${name}', apply() { ${apply} } }\n`)
}

const startupReport = async () => {
  const { promise, resolve: settle, reject } = Promise.withResolvers<FailedPlugin[]>()
  const proc = Bun.spawn([process.execPath, MAIN, 'runtime'], {
    cwd: home,
    env: { ...process.env, SAND_HOME: home, [runtimeEnv.id]: Bun.randomUUIDv7(), [runtimeEnv.secret]: 'secret' },
    stdin: 'ignore',
    stdout: 'ignore',
    stderr: 'ignore',
    serialization: 'json',
    ipc(message: RuntimeMessage) {
      if (message.type === 'call') proc.send({ type: 'answer', id: message.id, error: `Nothing answers ${message.request}` } satisfies HostMessage)
      if (message.type === 'ready' || message.type === 'failed') settle(message.failed)
    },
  })
  void proc.exited.then(code => reject(new Error(`the runtime exited with code ${code} before it reported`)))
  try {
    return await promise
  } finally {
    proc.kill()
    await proc.exited
  }
}

beforeAll(async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-failed-'))
  await Bun.write(join(home, 'sand.toml'), SETTINGS)
  await writePlugin('broken', "throw new Error('broken on purpose')")
  failed = await startupReport()
})

afterAll(() => rmSync(home, { recursive: true, force: true }))

test('the runtime reports a plugin whose apply throws as failed to load', () => {
  expect(failed).toContainEqual({ id: 'broken', error: 'broken on purpose' })
})

test('the runtime does not report errors that background work hits while it starts, like host calls nothing answers', () => {
  expect(failed).toEqual([{ id: 'broken', error: 'broken on purpose' }])
})
