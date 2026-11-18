import { statfsSync } from 'node:fs'

const freeBytes = (folder: string) => {
  const { bavail, bsize } = statfsSync(folder)
  return bavail * bsize
}

export { freeBytes }
