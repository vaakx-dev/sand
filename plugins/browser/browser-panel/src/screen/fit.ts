export interface Size {
  width: number
  height: number
}

export interface Rect extends Size {
  left: number
  top: number
}

export const fitRect = (box: Size, image: Size): Rect => {
  if (!image.width || !image.height) return { left: 0, top: 0, width: box.width, height: box.height }
  const scale = Math.min(box.width / image.width, box.height / image.height)
  const width = image.width * scale
  const height = image.height * scale
  return { left: (box.width - width) / 2, top: (box.height - height) / 2, width, height }
}

export const sameSize = (a: Size | undefined, b: Size | undefined) => a?.width === b?.width && a?.height === b?.height
