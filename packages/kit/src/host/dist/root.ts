import { dirname, resolve } from 'node:path'

export const appRoot = (main: string) => resolve(dirname(main), '..', '..', '..')
