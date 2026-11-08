import { expect, test } from 'bun:test'
import { basename, join } from 'node:path'
import { pluginFolders } from '../src/extensions/folders'

test('every built-in web extension has its own folder name, since the page knows extensions by it', async () => {
  const folders = await pluginFolders(join(import.meta.dir, '../../..'), true)
  const web = await Promise.all(folders.map(async dir => ((await Bun.file(join(dir, 'package.json')).json()).sand?.web ? [basename(dir)] : [])))
  const names = web.flat()
  expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([])
})
