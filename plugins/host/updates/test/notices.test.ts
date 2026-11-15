import { setAside } from '@sand/util/fs'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { homeNotices, setAsideIds } from '../src/notices'

const homes: string[] = []

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

test('damaged files sand set aside are told to the user in one short card, with where the copies are in its details, until dismissed', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-notices-'))
  homes.push(home)
  const identity = join(home, 'devices', 'identity.json')
  await Bun.write(identity, '{"keys":')
  await Bun.write(join(home, 'sand.toml'), '[host')
  await setAside(identity, 'is not valid JSON')
  await setAside(join(home, 'sand.toml'), 'is not valid TOML')

  const [card] = await homeNotices(home, () => false)
  expect(card).toMatchObject({ title: '2 files were reset' })
  expect(card!.summary).not.toContain(home)
  expect(card!.summary).toContain('Pair your PCs and phones again')
  expect(card!.details).toContain(join(home, 'devices', 'identity.json.damaged-'))

  const dismissed = new Set(await setAsideIds(home))
  expect(await homeNotices(home, id => dismissed.has(id))).toEqual([])
})
