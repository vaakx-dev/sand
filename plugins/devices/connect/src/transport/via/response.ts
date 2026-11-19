import { type RelayChunk, viaClose } from '@sand/devices-contract'
import { decodeBase64 } from './base64'
import type { ViaRelay } from './relay'

interface Fed {
  relay: ViaRelay
  stream: string
  stop(): void
}

export const fedBody = ({ relay, stream, stop }: Fed) => {
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  let open = true

  const finish = () => {
    open = false
    stop()
  }

  const close = () => {
    if (!open) return
    finish()
    void relay.call(viaClose, { stream }).catch(() => {})
  }

  const readable = new ReadableStream<Uint8Array>({
    start: started => void (controller = started),
    cancel: close,
  })

  const take = (chunk: RelayChunk) => {
    if (chunk.stream !== stream || !open) return
    if ('data' in chunk) return controller?.enqueue(decodeBase64(chunk.data))
    finish()
    if ('done' in chunk) controller?.close()
    else controller?.error(new Error(chunk.error))
  }

  const fail = (reason: unknown) => {
    if (!open) return
    controller?.error(reason)
    close()
  }

  return { readable, take, fail }
}
