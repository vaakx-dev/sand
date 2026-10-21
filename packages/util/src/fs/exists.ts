import { lstat, rm } from 'node:fs/promises'

export const exists = (path: string): Promise<boolean> => lstat(path).then(() => true, () => false)

export const isLink = (path: string): Promise<boolean> => lstat(path).then(info => info.isSymbolicLink(), () => false)

export const removeQuietly = (path: string) => rm(path, { recursive: true, force: true }).catch(() => {})
