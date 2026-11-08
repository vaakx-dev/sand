const joined = (head: Uint8Array, tail: Uint8Array) => {
  if (!head.length) return tail
  const out = new Uint8Array(head.length + tail.length)
  out.set(head)
  out.set(tail, head.length)
  return out
}

export const byteReader = (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader()
  let held: Uint8Array = new Uint8Array(0)

  const more = async () => {
    const { done, value } = await reader.read()
    if (done) throw new Error('The copied archive ends too soon')
    held = joined(held, value)
  }

  const next = async (most: number) => {
    if (!held.length) await more()
    const part = held.subarray(0, Math.min(most, held.length))
    held = held.subarray(part.length)
    return part
  }

  const take = async (length: number) => {
    while (held.length < length) await more()
    return next(length)
  }

  async function* parts(length: number) {
    for (let left = length; left > 0; ) {
      const part = await next(left)
      left -= part.length
      yield part
    }
  }

  const skip = async (length: number) => {
    for (let left = length; left > 0; ) left -= (await next(left)).length
  }

  return { take, parts, skip, close: () => reader.cancel() }
}

export type ByteReader = ReturnType<typeof byteReader>
