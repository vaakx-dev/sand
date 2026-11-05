import { bytes } from '@sand/util'
import { isMissing } from '@sand/util/fs'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ContextKind } from './contract'

const inlineLimit = 100_000

const isBinary = (data: Uint8Array) => data.subarray(0, 8192).includes(0)

const fileAt = (path: string) =>
  stat(path).then(
    info => (info.isFile() ? info : undefined),
    error => {
      if (isMissing(error)) return undefined
      throw error
    },
  )

export const fileKind: ContextKind = {
  kind: 'file',
  title: 'File',
  async project({ data }, { cwd }) {
    if (typeof data.path !== 'string' || !data.path) return undefined
    const path = resolve(cwd, data.path)
    const info = await fileAt(path)
    if (!info) return undefined
    const note = `Path: ${path}\nSize: ${bytes(info.size)}`
    if (info.size > inlineLimit) return `${note}\nToo large to include here; read it with your tools.`
    const content = await Bun.file(path).bytes()
    if (isBinary(content)) return `${note}\nNot a text file; read it with your tools.`
    return `${note}\n\n${new TextDecoder().decode(content)}`
  },
}
