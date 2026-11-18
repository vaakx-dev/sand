import { keyedSerial } from '@sand/util'
import { isUtf8 } from 'node:buffer'

type Encoding = 'utf-8' | 'windows-1252'

interface Text {
  content: string
  encoding: Encoding
}

type Encoded = { bytes: Uint8Array; error?: undefined } | { error: string }

const UTF_8 = new TextDecoder('utf-8', { ignoreBOM: true })
const WINDOWS_1252 = new TextDecoder('windows-1252')
const WINDOWS_1252_BYTES = new Map(Array.from({ length: 256 }, (_, byte) => [WINDOWS_1252.decode(Uint8Array.of(byte)), byte]))

const exclusive = keyedSerial()

const encodingOf = (bytes: Uint8Array): Encoding => (isUtf8(bytes) ? 'utf-8' : 'windows-1252')

const decode = (bytes: Uint8Array): Text => {
  const encoding = encodingOf(bytes)
  const decoder = encoding === 'utf-8' ? UTF_8 : WINDOWS_1252
  return { content: decoder.decode(bytes), encoding }
}

const encode = ({ content, encoding }: Text): Encoded => {
  if (encoding === 'utf-8') return { bytes: new TextEncoder().encode(content) }
  const missing = [...content].find(char => !WINDOWS_1252_BYTES.has(char))
  if (missing !== undefined) return { error: `it is saved as Windows-1252, which has no "${missing}"` }
  return { bytes: Uint8Array.from(content, char => WINDOWS_1252_BYTES.get(char)!) }
}

const readBytes = async (path: string) => {
  const file = Bun.file(path)
  if (!(await file.exists())) throw new Error(`File not found: ${path}`)
  return file.bytes()
}

const readText = async (path: string) => decode(await readBytes(path))

const savedEncoding = async (path: string): Promise<Encoding> => {
  const file = Bun.file(path)
  return (await file.exists()) ? encodingOf(await file.bytes()) : 'utf-8'
}

export type { Text }
export { decode, encode, exclusive, readBytes, readText, savedEncoding }
