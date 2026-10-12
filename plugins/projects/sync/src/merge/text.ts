import { diff3 } from './diff3'

export const isText = (bytes: Uint8Array) => !bytes.includes(0)

const toLines = (bytes: Uint8Array) => {
  const parts = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length).toString('latin1').split('\n')
  const last = parts.pop() ?? ''
  const lines = parts.map(part => `${part}\n`)
  if (last) lines.push(last)
  return lines
}

export const mergeText = (base: Uint8Array, ours: Uint8Array, theirs: Uint8Array) => {
  const merged = diff3(toLines(base), toLines(ours), toLines(theirs))
  return { bytes: new Uint8Array(Buffer.from(merged.lines.join(''), 'latin1')), conflicted: merged.conflicts > 0 }
}
