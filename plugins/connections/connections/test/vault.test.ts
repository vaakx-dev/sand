import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openVault, type Keychain } from '../src/vault'

const fakeKeychain = () => {
  const saved = new Map<string, string>()
  const name = ({ service, name }: { service: string; name: string }) => `${service}/${name}`
  const keychain: Keychain = {
    get: async options => saved.get(name(options)) ?? null,
    set: async options => void saved.set(name(options), options.value),
    delete: async options => saved.delete(name(options)),
  }
  return { saved, keychain }
}

test('tests never reach the real keychain', () => {
  expect(Bun.env.SAND_KEYCHAIN).toBe('off')
})

test('the vault key lives in the keychain only while the vault holds something', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-vault-'))
  const { saved, keychain } = fakeKeychain()
  try {
    const vault = await openVault(home, keychain)
    expect(saved.size).toBe(0)
    await vault.write({ entries: [], clients: { google: { id: 'client-1' } } })
    expect(vault.keychain()).toBe(true)
    expect(saved.size).toBe(1)
    expect(await Bun.file(join(home, 'connections.key')).exists()).toBe(false)
    expect(await (await openVault(home, keychain)).read()).toEqual({ entries: [], clients: { google: { id: 'client-1' } } })
    await vault.write({ entries: [], clients: {} })
    expect(saved.size).toBe(0)
    expect(await Bun.file(join(home, 'connections.vault')).exists()).toBe(false)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
