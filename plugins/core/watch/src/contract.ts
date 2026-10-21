import type { WatchOptions } from '@sand/util/fs'
import { type Dispose, service } from 'drydock'

export interface WatchedFolders<T> {
  get(dir: string): Promise<T>
  close(): void
}

export interface Watcher {
  debounced(dir: string, options: WatchOptions, onChange: () => void, ms?: number): Dispose
  folders<T>(load: (dir: string) => Promise<T>, empty: T, changed?: (dir: string) => void): WatchedFolders<T>
}

export const watcher = service<Watcher>('watcher')
