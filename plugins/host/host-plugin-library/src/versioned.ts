import type { HostVersions, VersionSource } from '@sand/host-plugin-versions/contract'

export const versioned =
  (versions: () => HostVersions | undefined) => (source: VersionSource, plugin: string, run: () => Promise<void>) => async () => {
    const keys = [`plugins/${plugin}`]
    await versions()?.snapshot('edit', keys).catch(() => {})
    try {
      await run()
    } finally {
      await versions()?.snapshot(source, keys).catch(() => {})
    }
  }
