import type { Peers } from '@sand/devices-contract'
import { cancelled } from '../ssh/failure'

const peerWait = 60_000

export const peerConnected = (peers: Peers, pc: string, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const connected = () => peers.get(pc)?.status.phase === 'connected'
    const finish = (error?: Error) => {
      stopWatching()
      clearTimeout(timer)
      signal.removeEventListener('abort', cancel)
      if (error) reject(error)
      else resolve()
    }
    const cancel = () => finish(cancelled())
    const check = () => {
      if (connected()) finish()
    }
    const stopWatching = peers.onChange(check)
    const timer = setTimeout(() => finish(new Error(`The SSH tunnel is up, but this PC can't reach sand on ${peers.get(pc)?.name ?? pc} through it`)), peerWait)
    signal.addEventListener('abort', cancel, { once: true })
    if (signal.aborted) cancel()
    else check()
  })
