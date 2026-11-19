import { loginStatus } from '@sand/accounts/contract'
import { markSandbox } from '@sand/boot'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { readArgs } from '../src/app/args'

const savedEnv = { ...process.env }

let root: string
let box: string
let sand: Sand | undefined

const insideBox = (path: string | undefined) => path?.startsWith(box + sep) === true

const lendRealAccounts = async () => {
  const user = join(root, 'user')
  await Bun.write(join(user, '.codex', 'auth.json'), JSON.stringify({ tokens: { access_token: 'real-plan' } }))
  process.env.HOME = user
  process.env.USERPROFILE = user
  process.env.OPENAI_API_KEY = 'sk-real-key'
  process.env.ANTHROPIC_API_KEY = 'sk-ant-real-key'
}

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'sand-sandbox-test-'))
  box = join(root, 'box')
  mkdirSync(box)
  await markSandbox(box)
  await lendRealAccounts()
})

afterEach(async () => {
  await sand?.stop()
  sand = undefined
  for (const name of Object.keys(process.env)) if (!(name in savedEnv)) delete process.env[name]
  Object.assign(process.env, savedEnv)
  rmSync(root, { recursive: true, force: true })
})

test('a marked home is a sandbox in safe mode too, with no API keys and its Codex and Claude folders inside the box', () => {
  const args = readArgs(['--home', box, '--safe', 'serve'])
  expect(args).toMatchObject({ sandbox: true, safe: true })
  expect(Object.keys(process.env).filter(name => name.endsWith('_API_KEY'))).toEqual([])
  expect(insideBox(process.env.CODEX_HOME)).toBe(true)
  expect(insideBox(process.env.CLAUDE_CONFIG_DIR)).toBe(true)
})

test('a home without the marker keeps the real accounts', () => {
  const other = join(root, 'other')
  mkdirSync(other)
  expect(readArgs(['--home', other, 'serve']).sandbox).toBe(false)
  expect(process.env.OPENAI_API_KEY).toBe('sk-real-key')
  expect(process.env.CODEX_HOME).toBe(savedEnv.CODEX_HOME)
})

test('a sandbox in safe mode has none of the real accounts', async () => {
  readArgs(['--home', box, '--safe', 'serve'])
  sand = await startSand([{ id: 'fake', label: 'Fake Plan', models: ['m'], replies: [] }], { home: box, plugins: ['core/codex'] })
  const { accounts } = await sand.ask(loginStatus, {})
  const real = accounts.filter(account => ['openai', 'anthropic', 'codex', 'claude'].includes(account.id))
  expect(real.length).toBeGreaterThan(0)
  expect(real.filter(account => account.signedIn)).toEqual([])
})
