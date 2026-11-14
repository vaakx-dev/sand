import { expect, test } from 'bun:test'
import { deflateSync } from 'node:zlib'
import { fontNames } from '../src/web/names'

type Name = [platform: number, language: number, id: number, text: string]

const NAMES: Name[] = [
  [1, 0, 1, 'Harbor Classic'],
  [3, 0x40c, 1, 'Port'],
  [3, 0x409, 1, 'Harbor'],
  [3, 0x409, 16, 'Harbor Display'],
  [3, 0x409, 2, 'Bold'],
  [3, 0x409, 5, 'Version 1.5; build 7'],
  [3, 0x409, 0, 'Copyright 2026 Harbor Type Works'],
]

const encoded = (platform: number, text: string) =>
  platform === 1 ? new TextEncoder().encode(text) : new Uint8Array([...text].flatMap(character => [0, character.charCodeAt(0)]))

const nameTable = (names: Name[]) => {
  const strings = names.map(([platform, , , text]) => encoded(platform, text))
  const stringsAt = 6 + names.length * 12
  const table = new Uint8Array(stringsAt + strings.reduce((total, string) => total + string.length, 0))
  const view = new DataView(table.buffer)
  view.setUint16(2, names.length)
  view.setUint16(4, stringsAt)
  let offset = 0
  names.forEach(([platform, language, id], index) => {
    const at = 6 + index * 12
    view.setUint16(at, platform)
    view.setUint16(at + 2, platform === 3 ? 1 : 0)
    view.setUint16(at + 4, language)
    view.setUint16(at + 6, id)
    view.setUint16(at + 8, strings[index]!.length)
    view.setUint16(at + 10, offset)
    table.set(strings[index]!, stringsAt + offset)
    offset += strings[index]!.length
  })
  return table
}

const sfnt = (table: Uint8Array) => {
  const font = new Uint8Array(28 + table.length)
  const view = new DataView(font.buffer)
  view.setUint32(0, 0x00010000)
  view.setUint16(4, 1)
  view.setUint32(12, 0x6e616d65)
  view.setUint32(20, 28)
  view.setUint32(24, table.length)
  font.set(table, 28)
  return font
}

const woff = (table: Uint8Array) => {
  const packed = deflateSync(table)
  const font = new Uint8Array(64 + packed.length)
  const view = new DataView(font.buffer)
  view.setUint32(0, 0x774f4646)
  view.setUint32(4, 0x00010000)
  view.setUint16(12, 1)
  view.setUint32(44, 0x6e616d65)
  view.setUint32(48, 64)
  view.setUint32(52, packed.length)
  view.setUint32(56, table.length)
  font.set(packed, 64)
  return font
}

const HARBOR = { family: 'Harbor Display', style: 'Bold', version: 'Version 1.5', copyright: 'Copyright 2026 Harbor Type Works' }

test("a font's name table gives its typographic family, style, version and copyright, in US English", async () => {
  expect(await fontNames(sfnt(nameTable(NAMES)))).toEqual(HARBOR)
})

test('a WOFF font gives the same names from its compressed name table', async () => {
  expect(await fontNames(woff(nameTable(NAMES)))).toEqual(HARBOR)
})

test('a font with only Mac names still has a family', async () => {
  expect((await fontNames(sfnt(nameTable([[1, 0, 1, 'Harbor Classic']])))).family).toBe('Harbor Classic')
})
