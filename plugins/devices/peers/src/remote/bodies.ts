import { peersChunk } from '@sand/devices-contract'
import type { HostChannel } from '@sand/host-runtimes/contract'
import { decodeBytes } from '../encoding'

export const createBodies = (host: HostChannel) => {
  const open = new Map<string, ReadableStreamDefaultController<Uint8Array>>()

  const stop = host.on(peersChunk, chunk => {
    const controller = open.get(chunk.stream)
    if (!controller) return
    if ('data' in chunk) return controller.enqueue(decodeBytes(chunk.data))
    open.delete(chunk.stream)
    if ('done' in chunk) controller.close()
    else controller.error(new Error(chunk.error))
  })

  const fail = (stream: string, reason: unknown) => {
    open.get(stream)?.error(reason)
    open.delete(stream)
  }

  return {
    create: (stream: string, cancel: () => void) =>
      new ReadableStream<Uint8Array>({
        start: controller => void open.set(stream, controller),
        cancel() {
          open.delete(stream)
          cancel()
        },
      }),
    drop: (stream: string) => void open.delete(stream),
    fail,
    close() {
      stop()
      for (const stream of [...open.keys()]) fail(stream, new Error('the host link closed'))
    },
  }
}

export type Bodies = ReturnType<typeof createBodies>
