import { stored, untrack } from '@vaakx-dev/vrui'

const kept = 300

export interface Size {
  width: number
  height: number
}

export interface ImageSizes {
  get(key: string): Size | undefined
  set(key: string, size: Size): void
}

export const imageSizes = (): ImageSizes => {
  const saved = stored<Record<string, [number, number]>>('sand.images.sizes', {})
  const sizes = new Map(Object.entries(untrack(() => saved.get())))

  const trim = () => {
    for (const key of sizes.keys()) {
      if (sizes.size <= kept) return
      sizes.delete(key)
    }
  }

  return {
    get(key) {
      const [width, height] = sizes.get(key) ?? []
      return width && height ? { width, height } : undefined
    },
    set(key, { width, height }) {
      const [knownWidth, knownHeight] = sizes.get(key) ?? []
      if (knownWidth === width && knownHeight === height) return
      sizes.delete(key)
      sizes.set(key, [width, height])
      trim()
      saved.set(Object.fromEntries(sizes))
    },
  }
}
