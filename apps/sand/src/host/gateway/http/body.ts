const tooLarge = (limit: number, length: string | null) => Number(length ?? 0) > limit

export const readLimited = async (request: Request, limit: number): Promise<string | undefined> => {
  if (tooLarge(limit, request.headers.get('content-length'))) return undefined
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      void reader.cancel()
      return undefined
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

export const readJson = async (request: Request, limit: number): Promise<unknown> => {
  const body = await readLimited(request, limit)
  if (body === undefined) return undefined
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}
