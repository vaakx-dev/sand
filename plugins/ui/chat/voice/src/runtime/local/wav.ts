import { sampleRate } from '../../audio'

interface Chunk {
  at: number
  size: number
}

const PCM = 1

const BITS = 16

const HEADER_BYTES = 8

const fourCc = (bytes: Uint8Array, at: number) => String.fromCharCode(...bytes.subarray(at, at + 4))

const chunksOf = (bytes: Uint8Array, view: DataView) => {
  const found = new Map<string, Chunk>()
  for (let at = 12; at + HEADER_BYTES <= bytes.length; ) {
    const size = view.getUint32(at + 4, true)
    found.set(fourCc(bytes, at), { at: at + HEADER_BYTES, size: Math.min(size, bytes.length - at - HEADER_BYTES) })
    at += HEADER_BYTES + size + (size % 2)
  }
  return found
}

const plainPcm = (view: DataView, { at }: Chunk) =>
  view.getUint16(at, true) === PCM && view.getUint16(at + 2, true) === 1 && view.getUint32(at + 4, true) === sampleRate && view.getUint16(at + 14, true) === BITS

const samplesOf = (view: DataView, { at, size }: Chunk) => Float32Array.from({ length: Math.floor(size / 2) }, (_, index) => view.getInt16(at + index * 2, true) / 32768)

const pcmOf = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (fourCc(bytes, 0) !== 'RIFF' || fourCc(bytes, 8) !== 'WAVE') throw new Error("The recording isn't a WAV file")
  const chunks = chunksOf(bytes, view)
  const format = chunks.get('fmt ')
  const data = chunks.get('data')
  if (!format || !data || !plainPcm(view, format)) throw new Error(`The recording isn't 16-bit mono audio at ${sampleRate / 1000} kHz`)
  return samplesOf(view, data)
}

export { pcmOf }
