const flushEvery = 4 * 1024 * 1024

export const createSink = async (file: string) => {
  await Bun.write(file, '')
  const writer = Bun.file(file).writer({ highWaterMark: flushEvery })
  let written = 0
  let flushed = 0

  const write = async (bytes: Uint8Array) => {
    writer.write(bytes)
    written += bytes.length
    if (written - flushed < flushEvery) return
    flushed = written
    await writer.flush()
  }

  return {
    get written() {
      return written
    },
    async copy(chunks: AsyncIterable<Uint8Array> | Iterable<Uint8Array>) {
      for await (const chunk of chunks) await write(chunk)
    },
    end: () => writer.end(),
  }
}
