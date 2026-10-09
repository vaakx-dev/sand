import type { Context } from 'drydock'
import { mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { sandHome } from './home'

export const scratchRoot = (ctx?: Context) => join(sandHome(ctx), 'scratch')

export const scratchFolder = (ctx: Context | undefined, id: string): string => {
  if (!id || id === '.' || id === '..' || basename(id) !== id) throw new Error('Invalid thread id')
  const folder = join(scratchRoot(ctx), id)
  mkdirSync(folder, { recursive: true })
  return folder
}
