import { resolve } from 'node:path'

export const pathKey = (path: string) => (process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path))
