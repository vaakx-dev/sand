import { describe, expect, test } from 'bun:test'
import { sniff } from '../src/web/sniff'

const blob = (...parts: BlobPart[]) => new Blob(parts)

describe('sniff', () => {
  test('finds the PDF header, even after leading junk', async () => {
    expect(await sniff(blob('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj'))).toBe('pdf')
    expect(await sniff(blob(new Uint8Array(300), '%PDF-1.4\n'))).toBe('pdf')
  })

  test('tells a web page served under a .pdf name from other files', async () => {
    expect(await sniff(blob('\uFEFF\n  <!DOCTYPE html>\n<html><body>Sign in</body></html>'))).toBe('web page')
    expect(await sniff(blob('<html lang="en">'))).toBe('web page')
    expect(await sniff(blob('PK\x03\x04 a zip'))).toBe('other')
    expect(await sniff(blob('<htmlish>'))).toBe('other')
  })

  test('only looks at the start of the file', async () => {
    expect(await sniff(blob(new Uint8Array(2048), '%PDF-1.4\n'))).toBe('other')
  })
})
