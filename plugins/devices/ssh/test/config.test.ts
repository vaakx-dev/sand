import { afterEach, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readSshConfig } from '../src/host/hosts/config'
import { parseTarget, shownTarget } from '../src/host/hosts/target'

const folders: string[] = []

afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true })
})

const sshFolder = (files: Record<string, string>) => {
  const folder = mkdtempSync(join(tmpdir(), 'sand-ssh-config-'))
  folders.push(folder)
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(folder, name, '..'), { recursive: true })
    writeFileSync(join(folder, name), text)
  }
  return folder
}

test('lists concrete hosts from the config and its includes, in order, skipping patterns and Match blocks', async () => {
  const outside = sshFolder({ 'extra.conf': 'Host far\n  HostName far.example.com\n' })
  const folder = sshFolder({
    config: [
      '# comment',
      'Host web db "with space"',
      '  User deploy',
      'Host *.internal !bastion jump?',
      'Include conf.d/*.conf',
      `Include ${join(outside, 'extra.conf')}`,
      'Match host foo exec "true"',
      '  User other',
      'Host=after',
      'Include missing.conf',
    ].join('\n'),
    'conf.d/b.conf': 'Host beta\n',
    'conf.d/a.conf': 'Host alpha web\nInclude nested\n',
    nested: 'Host deep\n',
    'conf.d/skip.txt': 'Host ignored\n',
  })
  const config = await readSshConfig(folder)
  expect(config.aliases).toEqual(['web', 'db', 'with space', 'alpha', 'deep', 'beta', 'far', 'after'])
})

test('a config that includes itself stops instead of looping', async () => {
  const folder = sshFolder({ config: 'Host loop\nInclude config\n' })
  expect((await readSshConfig(folder)).aliases).toEqual(['loop'])
})

test('reads typed targets with users, ports and IPv6 brackets, and refuses option-like ones', () => {
  expect(parseTarget('box')).toEqual({ host: 'box' })
  expect(parseTarget('me@box.lan')).toEqual({ user: 'me', host: 'box.lan' })
  expect(parseTarget(' me@box:2222 ')).toEqual({ user: 'me', host: 'box', port: 2222 })
  expect(parseTarget('ssh://me@[fe80::1]:22')).toEqual({ user: 'me', host: 'fe80::1', port: 22 })
  expect(parseTarget('-oProxyCommand=evil')).toBeUndefined()
  expect(parseTarget('-me@box')).toBeUndefined()
  expect(parseTarget('me@box:99999')).toBeUndefined()
  expect(parseTarget('two words')).toBeUndefined()
})

test('shows what ssh -G resolved, leaving out the default port', () => {
  expect(shownTarget('user deploy\nhostname 10.0.0.5\nport 22\n')).toBe('deploy@10.0.0.5')
  expect(shownTarget('user me\r\nhostname box.lan\r\nport 2200\r\n')).toBe('me@box.lan:2200')
})
