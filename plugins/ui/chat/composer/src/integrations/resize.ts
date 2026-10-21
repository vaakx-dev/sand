const sendable = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const encodings = [['image/png', undefined], ['image/jpeg', 0.85], ['image/jpeg', 0.7]] as const

export interface ImageLimits {
  edge: number
  bytes: number
}

const encode = async (bitmap: ImageBitmap, scale: number, bytes: number) => {
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  for (const [type, quality] of encodings) {
    const blob = await canvas.convertToBlob({ type, quality })
    if (blob.size <= bytes) return blob
  }
  throw new Error('Still too large after resizing')
}

export const fitImage = async (file: File, { edge, bytes }: ImageLimits): Promise<Blob> => {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && sendable.has(file.type) && file.size <= bytes) return file
    return await encode(bitmap, scale, bytes)
  } finally {
    bitmap.close()
  }
}
