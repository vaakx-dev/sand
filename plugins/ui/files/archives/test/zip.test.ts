import { expect, test } from 'bun:test'
import { storedZip } from '@sand/zip'
import { readArchive, unpackEntry } from '../src/web/archive'

const encoder = new TextEncoder()

const GUIDE = '# Lantern guide\n\nLight the wick.\n'

const SAMPLE = storedZip([
  ['docs/', new Uint8Array()],
  ['docs/guide.md', encoder.encode(GUIDE)],
  ['./notes.txt', encoder.encode('stored as is')],
  ['../../escape.txt', encoder.encode('kept inside')],
  ['empty/', new Uint8Array()],
])

test('a zip lists its files and folders by clean paths and unpacks only the entry asked for', async () => {
  const archive = await readArchive({ name: 'sample.zip', data: SAMPLE, modified: 0 })
  if (archive.kind !== 'listing') throw new Error('expected a listing')
  expect(archive.entries.map(entry => [entry.path, entry.size])).toEqual([
    ['docs/guide.md', GUIDE.length],
    ['notes.txt', 12],
    ['escape.txt', 11],
  ])
  expect(archive.folders).toEqual(['docs', 'empty'])
  expect(new TextDecoder().decode(await unpackEntry(archive.entries[0]!))).toBe(GUIDE)
})
