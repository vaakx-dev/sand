import { setAside } from '@sand/util/fs'
import { afterEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { homeNotices } from '../src/notices'

const homes: string[] = []

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

test('a damaged file that sand set aside is told to the user with where its copy is, until dismissed', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-notices-'))
  homes.push(home)
  const identity = join(home, 'devices', 'identity.json')
  await Bun.write(identity, '{"keys":')
  await Bun.write(join(home, 'sand.toml'), '[host')
  await setAside(identity, 'is not valid JSON')
  await setAside(join(home, 'sand.toml'), 'is not valid TOML')

  const notices = await homeNotices(home, () => false)
  expect(notices.map(notice => notice.title).toSorted()).toEqual([
    "This PC's identity was reset, so your other PCs and phones must pair with it again",
    'Your settings in sand.toml were reset',
  ])
  const reset = notices.find(notice => notice.id.startsWith('devices/'))!
  expect(reset.detail).toContain(join(home, 'devices', 'identity.json.damaged-'))
  expect(await homeNotices(home, id => id === reset.id)).toHaveLength(1)
})
