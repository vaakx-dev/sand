import { TooLarge, type Fitted } from './fitted'

export const maxPdfBytes = 20_000_000
const maxTextLength = 400_000

const utf8 = (data: Uint8Array) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch {
    return undefined
  }
}

export const pdf = (data: Uint8Array, name: string): Fitted => {
  if (data.length > maxPdfBytes) throw new TooLarge(`${name} is larger than ${maxPdfBytes / 1_000_000} MB`)
  return { bytes: data, block: { type: 'document', mediaType: 'application/pdf', name } }
}

export const text = (data: Uint8Array, name: string): Fitted | undefined => {
  if (data.subarray(0, 8192).includes(0)) return undefined
  const decoded = utf8(data)
  if (decoded === undefined) return undefined
  if (decoded.length > maxTextLength) {
    throw new TooLarge(`${name} is too long to attach (${decoded.length} characters); ask sand to read it with its tools instead`)
  }
  return { bytes: data, block: { type: 'document', mediaType: 'text/plain', name } }
}
