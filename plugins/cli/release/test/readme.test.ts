import { expect, test } from 'bun:test'
import { resolve } from 'node:path'
import { addonReadme } from '../src/readme'
import { splitWorkspace } from '../src/split'

test('every add-on in this repo builds its catalog page, with a README for each add-on that has its own page', async () => {
  const { addons } = await splitWorkspace(resolve(import.meta.dir, '../../../..'))
  const built = await Promise.allSettled(addons.map(addonReadme))
  const failed = built.flatMap(result => (result.status === 'rejected' ? [String(result.reason)] : []))
  expect(failed).toEqual([])
})
