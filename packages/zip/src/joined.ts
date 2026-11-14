const joined = (chunks: Uint8Array[]) => {
  const whole = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0))
  chunks.reduce((at, chunk) => {
    whole.set(chunk, at)
    return at + chunk.length
  }, 0)
  return whole
}

export { joined }
