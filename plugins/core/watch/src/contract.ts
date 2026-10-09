import type { Dispose } from 'drydock'

export interface WatchOptions {
  recursive?: boolean
}

export interface WatchedFolders<T> {
  get(dir: string): Promise<T>
  close(): void
}

export interface Watcher {
  debounced(dir: string, options: WatchOptions, onChange: () => void): Dispose
  folders<T>(load: (dir: string) => Promise<T>, empty: T, changed?: (dir: string) => void): WatchedFolders<T>
}

declare module 'drydock' {
  interface Services {
    watcher: Watcher
  }
}
