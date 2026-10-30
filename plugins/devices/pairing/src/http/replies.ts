const noStore = { 'cache-control': 'no-store' }

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStore })
