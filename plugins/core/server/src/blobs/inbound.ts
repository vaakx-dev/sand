import { isRef, isText, rewrite, type Ref } from './media'
import type { FindBlob } from './store'

const missing = (ref: Ref) => new Error(`${ref.name ?? `An attached ${ref.type}`} is no longer stored on this PC`)

export const createInbound = (find: FindBlob) => {
  const restore = async (ref: Ref, session?: string) => {
    const file = await find(ref.blob, session)
    if (!file) throw missing(ref)
    const { blob, size, width, height, ...block } = ref
    const data = isText(ref.mediaType) ? await file.text() : Buffer.from(await file.bytes()).toString('base64')
    return { ...block, data }
  }

  return async <T>(value: T, session?: string): Promise<T> => {
    const found: Ref[] = []
    rewrite(value, fields => {
      if (isRef(fields)) found.push(fields)
      return fields
    })
    if (!found.length) return value
    const restored = new Map(await Promise.all(found.map(async ref => [ref, await restore(ref, session)] as const)))
    return rewrite(value, fields => (isRef(fields) ? (restored.get(fields) ?? fields) : fields)) as T
  }
}
