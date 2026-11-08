import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { discover } from '../src/extensions/discover'

const roots: string[] = []

const root = () => {
  const dir = mkdtempSync(join(tmpdir(), 'sand-web-'))
  roots.push(dir)
  return dir
}

const plugin = (dir: string, name: string) => Bun.write(join(dir, 'package.json'), JSON.stringify({ name, sand: { web: './src/index.ts' } }))

afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true })
})

test('built-in extensions are known by package name, and a user plugin named the same replaces one', async () => {
  const builtins = root()
  const user = root()
  await plugin(join(builtins, 'bots', 'ui'), '@sand/bot-views')
  await plugin(join(builtins, 'devices', 'ui'), '@sand/devices-ui')
  await plugin(join(user, 'devices-ui'), 'my-devices')

  const found = await discover(
    [
      { dir: builtins, builtin: true },
      { dir: user, builtin: false },
    ],
    [],
  )

  expect(found.map(({ id, dir }) => [id, dir]).sort()).toEqual([
    ['bot-views', join(builtins, 'bots', 'ui')],
    ['devices-ui', join(user, 'devices-ui')],
  ])
})
