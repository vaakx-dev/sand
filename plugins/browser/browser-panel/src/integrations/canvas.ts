import { fitRect, type Size } from '../screen/fit'

export const framePainter = (node: HTMLCanvasElement) => {
  const context = node.getContext('2d')
  let shown: ImageBitmap | undefined
  let generation = 0

  const draw = () => {
    const ratio = window.devicePixelRatio || 1
    const width = Math.max(1, Math.round(node.clientWidth * ratio))
    const height = Math.max(1, Math.round(node.clientHeight * ratio))
    if (node.width !== width) node.width = width
    if (node.height !== height) node.height = height
    if (!context) return
    context.clearRect(0, 0, width, height)
    if (!shown) return
    const rect = fitRect({ width, height }, shown)
    context.imageSmoothingQuality = 'high'
    context.drawImage(shown, rect.left, rect.top, rect.width, rect.height)
  }

  const paint = async (bytes: Uint8Array<ArrayBuffer>): Promise<Size | undefined> => {
    const ticket = generation
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }))
    if (ticket !== generation) {
      bitmap.close()
      return undefined
    }
    shown?.close()
    shown = bitmap
    draw()
    return { width: bitmap.width, height: bitmap.height }
  }

  const clear = () => {
    generation++
    shown?.close()
    shown = undefined
    draw()
  }

  return { draw, paint, clear }
}
