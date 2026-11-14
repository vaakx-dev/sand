import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTomlValues } from '../src/toml'

let dir: string
let path: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sand-toml-'))
  path = join(dir, 'sand.toml')
})

afterEach(() => rmSync(dir, { recursive: true, force: true }))

const text = () => Bun.file(path).text()

test('setting values changes only those keys in their table and keeps the rest of sand.toml as written', async () => {
  await Bun.write(path, '# mine\n[host]\nport = 0\n\n[features]\ngit = true # coding\nbots = false\n\n[plugins.web]\npaths = []\n')

  await setTomlValues(path, ['features'], { git: undefined, threads: false })

  expect(await text()).toBe('# mine\n[host]\nport = 0\n\n[features]\nbots = false\nthreads = false\n\n[plugins.web]\npaths = []\n')
})

test('a table with a quoted name is added once and then updated in place', async () => {
  await Bun.write(path, '[host]\nport = 0\n')
  const table = ['plugins', 'accounts', 'prices', 'openrouter/gpt-5.1']

  await setTomlValues(path, table, { input: 1, output: 3, note: 'list price' })
  await setTomlValues(path, table, { input: 0.25, note: undefined })

  expect(await text()).toBe('[host]\nport = 0\n\n[plugins.accounts.prices."openrouter/gpt-5.1"]\noutput = 3\ninput = 0.25\n')
})

test('setting values in a missing sand.toml creates it with the table, even when nothing is set', async () => {
  await setTomlValues(path, ['features'], { bots: undefined })

  expect(await text()).toBe('[features]\n')
})

test('values that would make sand.toml invalid are refused and the file is left alone', async () => {
  const before = '[plugins.accounts]\nprices = { a = { input = 1 } }\n'
  await Bun.write(path, before)

  await expect(setTomlValues(path, ['plugins', 'accounts', 'prices', 'a'], { input: 2 })).rejects.toThrow()
  expect(await text()).toBe(before)
})
