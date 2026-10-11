import type { DocumentBlock } from '@sand/messages'

export const maxPdfBytes = 20_000_000
export const maxTextLength = 400_000

const utf8 = (data: Uint8Array) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data)
  } catch {
    return undefined
  }
}

export const pdf = (data: Uint8Array, name: string): DocumentBlock => {
  if (data.length > maxPdfBytes) throw new Error(`${name} is larger than ${maxPdfBytes / 1_000_000} MB`)
  return { type: 'document', mediaType: 'application/pdf', data: data.toBase64(), name }
}

export const text = (data: Uint8Array, name: string): DocumentBlock | undefined => {
  if (data.subarray(0, 8192).includes(0)) return undefined
  const decoded = utf8(data)
  if (decoded === undefined) return undefined
  if (decoded.length > maxTextLength) {
    throw new Error(`${name} is too long to attach (${decoded.length} characters); ask sand to read it with its tools instead`)
  }
  return { type: 'document', mediaType: 'text/plain', data: decoded, name }
}
