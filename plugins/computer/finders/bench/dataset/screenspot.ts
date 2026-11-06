import type { Screenshot } from '@sand/computers/contract'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bucketOf, type Bucket } from '../score'
import type { Random } from './random'

const repo = 'https://huggingface.co/datasets/OS-Copilot/ScreenSpot-v2/resolve/main'
const archive = `${repo}/screenspotv2_image.zip`
const platforms = ['desktop', 'web', 'mobile'] as const
const cache = join(tmpdir(), 'sand-finders-bench', 'screenspot')

export interface Shot {
  id: string
  platform: string
  type: string
  instruction: string
  bucket: Bucket
  bbox: [number, number, number, number]
  image: string
}

interface Entry {
  offset: number
  size: number
  method: number
}

const cached = async (name: string, fetchBytes: () => Promise<Uint8Array>) => {
  const file = Bun.file(join(cache, name))
  if (await file.exists()) return file.bytes()
  const bytes = await fetchBytes()
  await Bun.write(file, bytes)
  return bytes
}

const ranged = async (range: string) => {
  const response = await fetch(archive, { headers: { range: `bytes=${range}` } })
  if (response.status !== 206) throw new Error(`ScreenSpot-v2 refused a range request: HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

const annotations = async (platform: string) => {
  const bytes = await cached(`${platform}.json`, async () => new Uint8Array(await (await fetch(`${repo}/screenspot_${platform}_v2.json`)).arrayBuffer()))
  const rows: { img_filename: string; bbox: [number, number, number, number]; instruction: string; data_type: string }[] = JSON.parse(new TextDecoder().decode(bytes))
  return rows.map((row, index) => ({
    id: `${platform}-${index}`,
    platform,
    type: row.data_type,
    instruction: row.instruction,
    bbox: row.bbox,
    image: row.img_filename,
    bucket: bucketOf({ width: row.bbox[2], height: row.bbox[3] }),
  }))
}

const directory = async () => {
  const tail = await cached('tail.bin', () => ranged('-65536'))
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength)
  let end = tail.length - 22
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--
  const count = view.getUint16(end + 10, true)
  const size = view.getUint32(end + 12, true)
  const listing = size <= end ? tail.subarray(end - size, end) : await cached('directory.bin', () => ranged(`${view.getUint32(end + 16, true)}-${view.getUint32(end + 16, true) + size - 1}`))
  const entries = new Map<string, Entry>()
  const list = new DataView(listing.buffer, listing.byteOffset, listing.byteLength)
  for (let at = 0, index = 0; index < count; index++) {
    const nameLength = list.getUint16(at + 28, true)
    const name = new TextDecoder().decode(listing.subarray(at + 46, at + 46 + nameLength))
    entries.set(name.split('/').at(-1)!, { method: list.getUint16(at + 10, true), size: list.getUint32(at + 20, true), offset: list.getUint32(at + 42, true) })
    at += 46 + nameLength + list.getUint16(at + 30, true) + list.getUint16(at + 32, true)
  }
  return entries
}

const unpack = async ({ offset, size, method }: Entry) => {
  const head = await ranged(`${offset}-${offset + 29}`)
  const view = new DataView(head.buffer, head.byteOffset)
  const start = offset + 30 + view.getUint16(26, true) + view.getUint16(28, true)
  const data = await ranged(`${start}-${start + size - 1}`)
  return method === 0 ? data : Bun.inflateSync(data)
}

export const pickShots = async (perBucket: number, r: Random) => {
  mkdirSync(cache, { recursive: true })
  const entries = await directory()
  const all = (await Promise.all(platforms.map(annotations))).flat().filter(shot => entries.has(shot.image))
  const groups = Map.groupBy(r.shuffle(all), shot => shot.bucket)
  return { shots: [...groups.values()].flatMap(group => group.slice(0, perBucket)), entries }
}

const isPng = (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50

export const loadShot = async (shot: Shot, entries: Map<string, Entry>): Promise<Screenshot> => {
  const bytes = await cached(shot.image, () => unpack(entries.get(shot.image)!))
  const png = isPng(bytes) ? bytes : await new Bun.Image(bytes).png().bytes()
  const { width, height } = await new Bun.Image(png).metadata()
  return { png, width, height }
}
