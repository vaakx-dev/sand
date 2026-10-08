import type { AnyPlugin } from '../plugin/types'

export interface Source {
  entry: string
  dir: string
}

export interface Loader {
  cwd(): string
  locate(path: string, base: string): Source
  load(entry: string): Promise<AnyPlugin>
  evict(dir: string): void
}
