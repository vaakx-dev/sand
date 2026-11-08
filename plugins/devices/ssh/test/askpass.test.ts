import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Asker, openBridge } from '../src/host/askpass/bridge'
import { askpassProgram } from '../src/host/askpass/program'

const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

const askpass = async (asker: Asker) => {
  const folder = mkdtempSync(join(tmpdir(), 'sand-askpass-'))
  cleanups.push(() => rmSync(folder, { recursive: true, force: true }))
  const bridge = openBridge(await askpassProgram(folder))
  cleanups.push(bridge.stop)
  const { env, dispose } = bridge.register(asker)
  cleanups.push(dispose)
  const run = async (prompt: string, kind?: string) => {
    const child = Bun.spawn([env.SSH_ASKPASS, prompt], {
      env: { ...process.env, ...env, ...(kind && { SSH_ASKPASS_PROMPT: kind }) },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [stdout, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
    return { stdout, code }
  }
  return { run, forget: dispose }
}

const hostKey = [
  "The authenticity of host 'box' can't be established.",
  'ED25519 key fingerprint is SHA256:abc.',
  'Are you sure you want to continue connecting (yes/no/[fingerprint])? ',
].join('\n')

test('the askpass program hands the whole prompt to the host and prints its answer for ssh', async () => {
  const seen: [string, string][] = []
  const { run } = await askpass(async (text, kind) => {
    seen.push([text, kind])
    return 'p@ss word'
  })
  const { stdout, code } = await run(hostKey, 'confirm')
  expect(code).toBe(0)
  expect(stdout.trimEnd()).toBe('p@ss word')
  expect(seen).toEqual([[hostKey, 'confirm']])
})

test('a cancelled prompt makes the askpass program fail so ssh gives up', async () => {
  const { run } = await askpass(async () => null)
  const { stdout, code } = await run('Verification code: ')
  expect(code).not.toBe(0)
  expect(stdout).toBe('')
})

test('an askpass program with a token the host forgot fails', async () => {
  const { run, forget } = await askpass(async () => 'secret')
  forget()
  const { stdout, code } = await run('Password: ')
  expect(code).not.toBe(0)
  expect(stdout).toBe('')
})
