import { limits } from '@sand/devices-terminal/contract'

export interface Batch {
  seq: number
  data: string
}

export const pendingLimit = 1_048_576

const isHigh = (code: number) => code >= 0xd800 && code <= 0xdbff

const cutAt = (text: string, from: number) => {
  const to = Math.min(text.length, from + limits.input)
  return to < text.length && isHigh(text.charCodeAt(to - 1)) ? to - 1 : to
}

export const createInput = (send: (batch: Batch) => Promise<unknown>, failed: (error: unknown) => void) => {
  let seq = 0
  let pending: Batch[] = []
  let open = false

  const deliver = (batch: Batch) =>
    send(batch).then(() => {
      pending = pending.filter(kept => kept.seq > batch.seq)
    }, failed)

  const waiting = () => pending.reduce((sum, batch) => sum + batch.data.length, 0)

  return {
    type(data: string) {
      if (waiting() + data.length > pendingLimit) return
      for (let from = 0; from < data.length; ) {
        const to = cutAt(data, from)
        const batch = { seq: ++seq, data: data.slice(from, to) }
        pending.push(batch)
        if (open) void deliver(batch)
        from = to
      }
    },
    resume() {
      open = true
      for (const batch of pending) void deliver(batch)
    },
    pause() {
      open = false
    },
    clear() {
      pending = []
    },
  }
}
