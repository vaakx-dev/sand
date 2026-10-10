import { stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BlobStore } from './store'

const day = 86_400_000
const kept = 14 * day
const startDelay = 60_000
const checkEvery = 3_600_000

export const scheduleSweep = (store: BlobStore, folder: string, report: (error: unknown) => void) => {
  const marker = join(folder, '.swept')

  const due = async () => {
    const last = await stat(marker).catch(() => undefined)
    return !last || Date.now() - last.mtimeMs >= day
  }

  const sweep = async () => {
    if (!(await due())) return
    await store.sweep(Date.now() - kept)
    await writeFile(marker, '').catch(() => {})
  }

  let busy = false
  const run = () => {
    if (busy) return
    busy = true
    void sweep()
      .catch(report)
      .finally(() => (busy = false))
  }
  let interval: Timer | undefined
  const start = setTimeout(() => {
    run()
    interval = setInterval(run, checkEvery)
  }, startDelay)
  return () => {
    clearTimeout(start)
    clearInterval(interval)
  }
}
