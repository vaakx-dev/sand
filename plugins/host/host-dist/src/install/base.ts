import type { HttpCall } from '@sand/host-gateway/contract'
import { textReply } from '@sand/kit/host'

export const expired = () => textReply('This install link has expired or was already used', 401)

export const installSecret = ({ url }: HttpCall) => url.searchParams.get('k') || undefined
