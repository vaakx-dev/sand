interface Counted {
  folder: string
  size: number
}

const WALK = new URL('./walk.ts', import.meta.url).href

export const walkSizes = (folders: string[], counted: (folder: string, size: number) => void) => {
  const worker = new Worker(WALK)
  const sizes = new Promise<Record<string, number>>((resolve, reject) => {
    const found: Record<string, number> = {}
    let left = folders.length
    worker.onmessage = ({ data: { folder, size } }: MessageEvent<Counted>) => {
      found[folder] = size
      counted(folder, size)
      if (--left === 0) resolve(found)
    }
    worker.onerror = event => reject(new Error(event.message))
    worker.postMessage(folders)
  }).finally(() => worker.terminate())
  return { sizes, stop: () => worker.terminate() }
}

export type SizeWalk = ReturnType<typeof walkSizes>
