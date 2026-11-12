import { afterEach, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { removePlugin, writePlugin } from '../src'

const homes: string[] = []

const tempHome = () => {
  const home = mkdtempSync(join(tmpdir(), 'plugin-files-'))
  homes.push(home)
  return home
}

const text = (path: string, value: string) => ({ path, bytes: new TextEncoder().encode(value), executable: false })

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

test('writing a plugin over an older copy drops stale files and keeps its installed dependencies', async () => {
  const home = tempHome()
  const folder = join(home, 'plugins', 'notes')
  mkdirSync(join(folder, 'node_modules', 'dep'), { recursive: true })
  writeFileSync(join(folder, 'node_modules', 'dep', 'index.js'), 'dep')
  writeFileSync(join(folder, 'old.ts'), 'old')

  await writePlugin({ home, plugin: 'notes', files: [text('package.json', '{}'), text('src/index.ts', 'new')] })

  expect(readFileSync(join(folder, 'src', 'index.ts'), 'utf8')).toBe('new')
  expect(existsSync(join(folder, 'old.ts'))).toBe(false)
  expect(readFileSync(join(folder, 'node_modules', 'dep', 'index.js'), 'utf8')).toBe('dep')
})

test('removing a plugin leaves the packages its dependency links point to', async () => {
  const home = tempHome()
  const shared = join(home, 'shared-dep')
  mkdirSync(shared)
  writeFileSync(join(shared, 'index.js'), 'shared')
  const folder = join(home, 'plugins', 'notes')
  mkdirSync(join(folder, 'node_modules', '@sand'), { recursive: true })
  symlinkSync(shared, join(folder, 'node_modules', '@sand', 'dep'), 'junction')

  await removePlugin(home, 'notes')

  expect(existsSync(folder)).toBe(false)
  expect(readFileSync(join(shared, 'index.js'), 'utf8')).toBe('shared')
})
