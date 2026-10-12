import { errorMessage } from '@sand/kit'
import type { RouteHandler } from '@sand/server/contract'
import type { TransferStore } from './transfers'

const answer = async (transfers: TransferStore, request: Request) => {
  const params = new URL(request.url).searchParams
  const transfer = params.get('transfer') ?? ''
  const index = Number(params.get('index'))
  if (request.method === 'GET') return new Response(transfers.read(transfer, index))
  await transfers.write({ transfer, size: Number(params.get('size')) }, index, await request.bytes())
  return new Response(null, { status: 204 })
}

export const transferRoute =
  (transfers: TransferStore): RouteHandler =>
  request =>
    answer(transfers, request).catch(error => new Response(errorMessage(error), { status: 400 }))
