import { addonFault } from '@sand/util/release'
import { afterEach, expect, test } from 'bun:test'
import { createApp } from 'drydock'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { cli, coreProblems } from '../src/contract'

const homes: string[] = []

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

const writePlugin = async (dir: string, name: string, body: string) => {
  await Bun.write(join(dir, 'package.json'), JSON.stringify({ name, type: 'module', sand: { runtime: './index.ts' } }))
  await Bun.write(join(dir, 'index.ts'), `export default { name: '${name}', apply() { ${body} } }\n`)
}

const faultOf = async (folder: string) => {
  for (let tries = 0; tries < 100; tries++) {
    const fault = await addonFault(folder)
    if (fault) return fault
    await Bun.sleep(50)
  }
}

test('an add-on that fails to load is turned off and recorded, and is no core problem', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-fault-'))
  homes.push(home)
  const builtins = join(home, 'core', 'plugins')
  const addon = join(home, 'plugins', 'coding')
  await Bun.write(join(addon, 'sand-addon.json'), JSON.stringify({ id: 'coding', source: 'test', version: '1', hash: 'a', sha256: 'b' }))
  await writePlugin(join(addon, 'broken'), 'broken', "throw new Error('sessionSettle is not exported')")
  await writePlugin(join(addon, 'fine'), 'fine', '')

  const app = createApp()
  app.provide(cli, { place: 'runtime', home, cwd: home, builtins, safe: false, args: [], exit() {} })
  app.load(resolve(import.meta.dir, '..', 'src', 'index.ts'))
  await app.settled()

  const fault = await faultOf(addon)
  expect(fault).toMatchObject({ build: 'source' })
  expect(fault?.error).toContain('sessionSettle is not exported')
  expect(coreProblems(app)).toEqual([])
  expect(app.scopes().filter(scope => scope.name === 'fine' && scope.status === 'active')).toEqual([])
  await app.dispose()
})
