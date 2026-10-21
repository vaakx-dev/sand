import { textReply } from '@sand/util/host'

export const json = (body: unknown) => Response.json(body, { headers: { 'cache-control': 'no-store' } })

export const unauthorized = () => textReply('unauthorized', 401)
