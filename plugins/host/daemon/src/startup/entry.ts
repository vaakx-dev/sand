import { shimFile } from '@sand/boot'
import { existsSync } from 'node:fs'
import { folder } from '../control/owner/serves-home'

export interface Entry {
  name: string
  home: string
  command: string[]
}

const launcher = (home: string) => {
  const shim = shimFile(home)
  return existsSync(shim) ? [shim] : [process.execPath, Bun.main]
}

export const serviceEntry = (home: string): Entry => ({
  name: `sand-${Bun.hash(folder(home)).toString(16).slice(0, 8)}`,
  home,
  command: [...launcher(home), '--home', home, 'service', 'run'],
})
