import { afterEach, expect, test } from 'bun:test'
import { createApp } from 'drydock'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { cli } from '../src/contract'

const homes: string[] = []

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

const writeNotes = async (dir: string, copy: string, log: string) => {
  const sand = { runtime: './index.ts', feature: 'notes', features: { notes: { label: 'Notes', ...(copy === 'add-on' && { addon: true }) } } }
  await Bun.write(join(dir, 'package.json'), JSON.stringify({ name: '@sand/notes', type: 'module', sand }))
  await Bun.write(join(dir, 'index.ts'), `export default { name: 'notes', apply() { require('node:fs').appendFileSync(${JSON.stringify(log)}, '${copy}\\n') } }\n`)
}

test('an add-on that sand now builds in loads only as the built-in copy', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-built-in-'))
  homes.push(home)
  const builtins = join(home, 'core', 'plugins')
  const addon = join(home, 'plugins', 'notes')
  const log = join(home, 'loaded.txt')
  await writeNotes(join(builtins, 'notes'), 'core', log)
  await Bun.write(join(addon, 'sand-addon.json'), JSON.stringify({ id: 'notes', source: 'test', version: '1', hash: 'a', sha256: 'b' }))
  await writeNotes(join(addon, 'notes'), 'add-on', log)

  const app = createApp()
  app.provide(cli, { place: 'runtime', home, cwd: home, builtins, safe: false, sandbox: false, args: [], exit() {} })
  app.load(resolve(import.meta.dir, '..', 'src', 'index.ts'))
  await app.settled()

  expect(await Bun.file(log).text()).toBe('core\n')
  await app.dispose()
})
