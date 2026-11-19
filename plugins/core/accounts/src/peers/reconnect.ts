import type { Peers as PcLinks } from '@sand/devices-contract'
import { untilAborted } from '@sand/util'

const RETRY_EVERY_MS = 5_000

const reopened = (links: PcLinks | undefined, pcs: string[]) => {
  let stop = () => {}
  const opened = new Promise<void>(resolve => {
    stop = links?.onOpen(pc => pcs.includes(pc) && resolve()) ?? stop
  })
  return { opened, stop }
}

export const nextTry = async (links: PcLinks | undefined, pcs: string[], signal?: AbortSignal) => {
  const { opened, stop } = reopened(links, pcs)
  const waited = Promise.race([opened, Bun.sleep(RETRY_EVERY_MS)])
  try {
    await (signal ? untilAborted(waited, signal) : waited)
  } finally {
    stop()
  }
}
