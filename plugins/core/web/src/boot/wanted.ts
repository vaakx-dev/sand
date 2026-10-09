import type { BundledExtension } from 'sand:extensions'

export type Wanted = Record<string, boolean>

export const initialWanted = (bundled: BundledExtension[]): Wanted => {
  const fallback = Object.fromEntries(bundled.map(extension => [extension.id, extension.enabled]))
  try {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="sand-extensions"]')?.content
    return meta ? { ...fallback, ...JSON.parse(meta) } : fallback
  } catch {
    return fallback
  }
}
