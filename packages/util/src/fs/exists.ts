import { lstat, rm } from 'node:fs/promises'
import { retryLocked } from './locked'

export const exists = (path: string): Promise<boolean> => lstat(path).then(() => true, () => false)

export const isLink = (path: string): Promise<boolean> => lstat(path).then(info => info.isSymbolicLink(), () => false)

export const removeFolder = (path: string) => retryLocked(() => rm(path, { recursive: true, force: true }))

export const removeQuietly = (path: string) => removeFolder(path).catch(() => {})
