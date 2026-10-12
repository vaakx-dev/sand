import type { WatchOptions } from '@sand/kit/fs'
import type { Dispose } from 'drydock'

export interface WatchedFolders<T> {
  get(dir: string): Promise<T>
  close(): void
}

export interface Watcher {
  debounced(dir: string, options: WatchOptions, onChange: () => void, ms?: number): Dispose
  folders<T>(load: (dir: string) => Promise<T>, empty: T, changed?: (dir: string) => void): WatchedFolders<T>
}

declare module 'drydock' {
  interface Services {
    watcher: Watcher
  }
}
