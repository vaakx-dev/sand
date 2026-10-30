import { readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { isHash } from '../store'

export type Providers = Set<() => Iterable<string>>

const day = 86_400_000
const startDelay = 60_000
const checkEvery = 3_600_000

const hashOf = (name: string) => name.slice(0, name.indexOf('.'))

const keptBy = (providers: Providers) => {
  const kept = new Set<string>()
  for (const provider of providers) for (const hash of provider()) kept.add(hash)
  return kept
}

const isOld = async (path: string, cutoff: number) => {
  const info = await stat(path).catch(() => undefined)
  return Boolean(info?.isFile() && info.mtimeMs < cutoff)
}

const sweep = async (folder: string, kept: Set<string>) => {
  const cutoff = Date.now() - day
  const present = new Set<string>()
  for (const name of await readdir(folder)) {
    const hash = hashOf(name)
    if (!isHash(hash)) continue
    const path = join(folder, name)
    const unused = name.endsWith('.tmp') || !kept.has(hash)
    if (unused && (await isOld(path, cutoff))) await rm(path, { force: true })
    else if (!name.endsWith('.tmp')) present.add(hash)
  }
  const sized = join(folder, 'sized')
  for (const name of await readdir(sized).catch((): string[] => [])) {
    if (!present.has(hashOf(name))) await rm(join(sized, name), { force: true })
  }
}

export const scheduleCollect = (folder: string, providers: Providers, report: (error: unknown) => void) => {
  const marker = join(folder, '.collected')

  const due = async () => {
    const last = await stat(marker).catch(() => undefined)
    return !last || Date.now() - last.mtimeMs >= day
  }

  const collect = async () => {
    if (!providers.size || !(await due())) return
    await sweep(folder, keptBy(providers))
    await Bun.write(marker, '')
  }

  let busy = false
  const run = () => {
    if (busy) return
    busy = true
    void collect()
      .catch(report)
      .finally(() => (busy = false))
  }
  let interval: Timer | undefined
  const start = setTimeout(() => {
    run()
    interval = setInterval(run, checkEvery).unref()
  }, startDelay).unref()
  return () => {
    clearTimeout(start)
    clearInterval(interval)
  }
}
