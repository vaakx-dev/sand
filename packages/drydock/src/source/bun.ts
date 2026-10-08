import { evict } from './evict'
import { loadPlugin } from './load'
import type { Loader } from './loader'
import { locate } from './locate'

export const bunLoader: Loader = {
  cwd: () => process.cwd(),
  locate,
  load: loadPlugin,
  evict,
}
