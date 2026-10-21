import type { HostVersions, VersionSource } from '@sand/host-plugin-versions/contract'

export const versioned =
  (versions: () => HostVersions | undefined, report: (error: unknown) => void) =>
  (source: VersionSource, plugin: string, run: () => Promise<void>) =>
  async () => {
    const keys = [`plugins/${plugin}`]
    await versions()?.snapshot('edit', keys).catch(report)
    try {
      await run()
    } finally {
      await versions()?.snapshot(source, keys).catch(report)
    }
  }
