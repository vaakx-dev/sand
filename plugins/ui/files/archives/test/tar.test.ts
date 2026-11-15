import { expect, test } from 'bun:test'
import { readArchive, unpackEntry } from '../src/web/archive'
import { paxRecord, tar } from './pack'

const LONG_NAME = `${'deep/'.repeat(30)}orchard.csv`

const SAMPLE = tar([
  { name: 'garden/', type: '5' },
  { name: 'beds.txt', prefix: 'garden/north', content: 'tomatoes, beans' },
  { name: 'PaxHeader', type: 'x', content: paxRecord('path', 'garden/a long pax name for the shed inventory.txt') },
  { name: 'short.txt', content: 'rake, hoe' },
  { name: '././@LongLink', type: 'L', content: `${LONG_NAME}\0` },
  { name: 'truncated', content: 'pear,12' },
  { name: 'garden/link', type: '2' },
])

const open = (name: string, data: Uint8Array) => readArchive({ name, data: new Uint8Array(data), modified: 0 })

const read = (content: Uint8Array) => new TextDecoder().decode(content)

test('a tar lists ustar prefixes, pax and GNU long names, also inside gzip', async () => {
  for (const [name, data] of [['garden.tar', SAMPLE], ['garden.tgz', Bun.gzipSync(SAMPLE)]] as const) {
    const archive = await open(name, data)
    if (archive.kind !== 'listing') throw new Error('expected a listing')
    expect(archive.folders).toEqual(['garden'])
    expect(archive.entries.map(entry => entry.path)).toEqual(['garden/north/beds.txt', 'garden/a long pax name for the shed inventory.txt', LONG_NAME])
    expect(read(await unpackEntry(archive.entries[1]!))).toBe('rake, hoe')
  }
})

test('a damaged or cut short tar is refused', async () => {
  const flipped = SAMPLE.slice()
  flipped[512 + 3]! ^= 1
  await expect(open('garden.tar', flipped)).rejects.toThrow('failed its checksum')
  await expect(open('garden.tar', SAMPLE.slice(0, 1024 + 5))).rejects.toThrow('ends partway through an entry')
})

test('a gzip of one file opens as that file', async () => {
  const archive = await open('field-notes.md.gz', Bun.gzipSync(new TextEncoder().encode('# Field notes')))
  if (archive.kind !== 'single') throw new Error('expected a single file')
  expect(archive.entry.path).toBe('field-notes.md')
  expect(read(await archive.entry.unpack())).toBe('# Field notes')
})
