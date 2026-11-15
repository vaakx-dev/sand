import { joined } from './joined'

const inflate = async (packed: Uint8Array<ArrayBuffer>, format: CompressionFormat, limitBytes: number) => {
  const reader = new Blob([packed]).stream().pipeThrough(new DecompressionStream(format)).getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (let read = await reader.read(); !read.done; read = await reader.read()) {
      size += read.value.length
      if (size > limitBytes) return undefined
      chunks.push(read.value)
    }
  } finally {
    await reader.cancel()
  }
  return joined(chunks)
}

export { inflate }
