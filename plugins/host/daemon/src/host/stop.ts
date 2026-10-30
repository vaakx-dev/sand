import type { Hub } from '@sand/host-hub/contract'
import { daemonStop } from '../contract'

const stopDelay = 100

export const handleStop = (hub: Hub, stop: () => void) =>
  hub.handle(daemonStop, (_, caller) => {
    if (caller.kind !== 'cli') throw new Error('only the sand command on this PC can stop sand')
    setTimeout(stop, stopDelay)
  })
