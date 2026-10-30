import { errorMessage } from '@sand/util'
import { createSocket, type Socket } from 'node:dgram'
import { isPrivateIpv4, unmapIpv4 } from '../../routes/hosts'
import { decodeBeacon, encodeBeacon } from './message'
import { broadcastTargets } from './targets'

const beaconPort = 4317

export interface BeaconOptions {
  id: string
  port(): number
  announcing(): boolean
  heard(address: string, port: number, id: string): void
}

export interface Beacon {
  announce(): void
  ask(): void
  close(): void
}

const bind = (socket: Socket) =>
  new Promise<void>((resolve, reject) => {
    socket.once('error', reject)
    socket.bind(beaconPort, '0.0.0.0', () => {
      socket.off('error', reject)
      resolve()
    })
  })

export const openBeacon = async ({ id, port, announcing, heard }: BeaconOptions): Promise<Beacon | undefined> => {
  const socket = createSocket({ type: 'udp4', reuseAddr: true })
  let open = false

  const send = (ask: boolean) => {
    if (!open) return
    const raw = encodeBeacon({ id, ask, ...(announcing() ? { port: port() } : {}) })
    for (const target of broadcastTargets()) socket.send(raw, beaconPort, target)
  }

  socket.on('message', (data, from) => {
    const address = unmapIpv4(from.address)
    const message = decodeBeacon(data)
    if (!message || message.id === id || !isPrivateIpv4(address)) return
    if (message.ask && announcing()) send(false)
    if (message.port) heard(address, message.port, message.id)
  })

  try {
    await bind(socket)
    socket.setBroadcast(true)
    socket.on('error', error => console.error(`sand's home network search failed: ${errorMessage(error)}`))
    socket.unref()
    open = true
  } catch (error) {
    socket.close()
    console.error(`sand can't look for your other PCs on the home network: ${errorMessage(error)}`)
    return undefined
  }

  return {
    announce: () => announcing() && send(false),
    ask: () => send(true),
    close: () => {
      open = false
      socket.close()
    },
  }
}
