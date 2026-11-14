import { expect, test } from 'bun:test'
import { storedZip, Zip } from '../src'
import { tamperZip, zip } from './pack'

const GUIDE = '# Lantern guide\n\nLight the wick.\n'.repeat(20)

const SAMPLE = zip([
  { name: 'docs/' },
  { name: 'docs/guide.md', content: GUIDE, deflate: true },
  { name: 'notes.txt', content: 'stored as is' },
])

const declaring = (count: number) => tamperZip(SAMPLE, view => view.setUint16(view.byteLength - 12, count, true))

test('a zip lists its entries and unpacks the deflated and stored ones', async () => {
  const archive = new Zip(SAMPLE)
  expect(archive.entries.map(entry => [entry.name, entry.size])).toEqual([
    ['docs/', 0],
    ['docs/guide.md', GUIDE.length],
    ['notes.txt', 12],
  ])
  expect(await archive.text('docs/guide.md')).toBe(GUIDE)
  expect(await archive.text('notes.txt')).toBe('stored as is')
  expect(archive.has('missing.txt')).toBe(false)
})

test('a zip with too many entries, or a falsified count, is refused before anything is unpacked', () => {
  expect(() => new Zip(SAMPLE, { entries: 2 })).toThrow('more than 2 files')
  expect(() => new Zip(declaring(2))).toThrow('lists more entries than it declares')
  expect(() => new Zip(declaring(5))).toThrow('claims more entries than its directory holds')
  expect(() => new Zip(declaring(60_000))).toThrow('more than 10,000 files')
})

test('an entry declared too large is refused before unpacking, and one that unpacks past its declared size is stopped', async () => {
  const bomb = zip([{ name: 'zeros.bin', content: '\0'.repeat(1_000_000), deflate: true }])
  await expect(new Zip(bomb, { entryBytes: 500_000 }).bytes('zeros.bin')).rejects.toThrow(/zeros\.bin unpacks to .+, more than the .+ allowed/)
  const understated = tamperZip(bomb, (view, central) => view.setUint32(central(0) + 24, 1000, true))
  await expect(new Zip(understated).bytes('zeros.bin')).rejects.toThrow("doesn't unpack to the size it declares")
})

test('the unpacked total counts an entry read twice once, and refuses entries past it', async () => {
  const archive = new Zip(zip([{ name: 'shared.xml', content: 'a'.repeat(200) }, { name: 'other.xml', content: 'b'.repeat(100), deflate: true }]), { totalBytes: 250 })
  expect(await archive.bytes('shared.xml')).toHaveLength(200)
  expect(await archive.bytes('shared.xml')).toHaveLength(200)
  await expect(archive.bytes('other.xml')).rejects.toThrow('it unpacks to more than')
})

test('entries that share the same packed data are refused as a zip bomb', () => {
  const shared = tamperZip(SAMPLE, (view, central) => view.setUint32(central(2) + 42, view.getUint32(central(1) + 42, true), true))
  expect(() => new Zip(shared)).toThrow('entries overlap')
})

test('an entry whose content was changed fails its checksum', async () => {
  const changed = tamperZip(SAMPLE, (view, central) => view.setUint8(view.getUint32(central(2) + 42, true) + 30 + 'notes.txt'.length, 0x53))
  await expect(new Zip(changed).text('notes.txt')).rejects.toThrow('notes.txt failed its checksum')
})

test('a stored zip it writes reads back whole', async () => {
  const picture = new Uint8Array([137, 80, 78, 71])
  const archive = new Zip(storedZip([
    ['word/document.xml', new TextEncoder().encode('<document>tide</document>')],
    ['word/media/größe.png', picture],
  ]))
  expect(archive.entries.map(entry => entry.name)).toEqual(['word/document.xml', 'word/media/größe.png'])
  expect(await archive.text('word/document.xml')).toBe('<document>tide</document>')
  expect(await archive.bytes('word/media/größe.png')).toEqual(picture)
})
