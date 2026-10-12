import { mapLimit } from '../io/pool'
import { decode, digestOf, hashBlob, hashOf, largeBlob } from '../store/encoding'
import type { PackedObject } from '../store/pack'

interface Run {
  from: number
  to: number
  objects: PackedObject[]
}

const runBytes = 16 * 1024 * 1024

const damaged = () => new Error('The transfer was damaged on the way')

const endOf = ({ offset, length }: PackedObject) => offset + length

const isBig = ({ length }: PackedObject) => length > largeBlob

const check = async (bytes: Uint8Array<ArrayBuffer>, { id, compressed }: PackedObject) => {
  const hash = compressed ? hashOf(decode({ bytes, compressed })) : await digestOf(bytes)
  if (hash !== id) throw damaged()
}

const runsOf = (objects: PackedObject[]) => {
  const runs: Run[] = []
  for (const object of objects.toSorted((a, b) => a.offset - b.offset)) {
    const last = runs.at(-1)
    if (!last || endOf(object) - last.from > runBytes) {
      runs.push({ from: object.offset, to: endOf(object), objects: [object] })
      continue
    }
    last.objects.push(object)
    last.to = Math.max(last.to, endOf(object))
  }
  return runs
}

const verifyRun = async (pack: string, { from, to, objects }: Run) => {
  const bytes = await Bun.file(pack).slice(from, to).bytes()
  for (const object of objects) await check(bytes.subarray(object.offset - from, endOf(object) - from), object)
}

const verifyBig = async (pack: string, object: PackedObject) => {
  const slice = Bun.file(pack).slice(object.offset, endOf(object))
  if (object.compressed) return check(await slice.bytes(), object)
  if ((await hashBlob(slice)) !== object.id) throw damaged()
}

export const verifyPack = async (pack: string, objects: PackedObject[]) => {
  await mapLimit(runsOf(objects.filter(object => !isBig(object))), 4, run => verifyRun(pack, run))
  await mapLimit(objects.filter(isBig), 4, object => verifyBig(pack, object))
}
