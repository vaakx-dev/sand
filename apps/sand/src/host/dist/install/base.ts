import type { HttpCall } from '@sand/protocol'

export const executableList = '.executable'

const expiredMessage = 'This install link has expired or was already used'

export const text = (body: string, status: number) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })

export const expired = () => text(expiredMessage, 401)

export const installSecret = ({ url }: HttpCall) => url.searchParams.get('k') || undefined

export const readText = async (request: Request, limit: number): Promise<string | undefined> => {
  if (Number(request.headers.get('content-length') ?? 0) > limit) return
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
      return
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}
