export const text = (body: string, status: number, headers?: Record<string, string>) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...headers } })

export const json = (body: unknown) => Response.json(body, { headers: { 'cache-control': 'no-store' } })

export const unauthorized = () => text('unauthorized', 401)
