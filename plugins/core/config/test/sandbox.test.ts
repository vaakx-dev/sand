import { afterEach, expect, test } from 'bun:test'
import { createApp } from 'drydock'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { cli } from '../src/contract'
import { sandOf } from '../src/find'

const homes: string[] = []

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

const writePlugin = (builtins: string, name: string, network: boolean) =>
  Promise.all([
    Bun.write(join(builtins, name, 'package.json'), JSON.stringify({ name: `@sand/${name}`, type: 'module', sand: { host: './index.ts', ...(network && { network }) } })),
    Bun.write(join(builtins, name, 'index.ts'), `export default { name: '${name}', apply() {} }\n`),
  ])

const loadedIn = async (options: { safe: boolean; sandbox: boolean }) => {
  const home = mkdtempSync(join(tmpdir(), 'sand-network-'))
  homes.push(home)
  const builtins = join(home, 'core', 'plugins')
  await writePlugin(builtins, 'devices-network', true)
  await writePlugin(builtins, 'notes', false)
  await Bun.write(join(home, 'sand.toml'), '')
  const app = createApp()
  app.provide(cli, { place: 'host', home, cwd: home, builtins, args: [], exit() {}, ...options })
  app.load(resolve(import.meta.dir, '..', 'src', 'index.ts'))
  await app.settled()
  const loaded = app.scopes().flatMap(scope => (scope.kind === 'plugin' && scope.status === 'active' ? [scope.name] : []))
  await app.dispose()
  return loaded.filter(name => name !== 'config')
}

test.each([{ safe: false }, { safe: true }])('a sandbox leaves out the plugins that open the network, in safe mode or not: %j', async ({ safe }) => {
  expect(await loadedIn({ safe, sandbox: true })).toEqual(['notes'])
})

test('outside a sandbox the plugins that open the network load', async () => {
  expect((await loadedIn({ safe: true, sandbox: false })).sort()).toEqual(['devices-network', 'notes'])
})

test('devices-network says it opens the network', async () => {
  expect((await sandOf(resolve(import.meta.dir, '..', '..', '..', 'devices', 'network'))).network).toBe(true)
})
