import { installParams } from '@sand/devices-contract'
import type { HttpCall } from '@sand/host-gateway/contract'
import { textReply } from '@sand/util/host'

export const expired = () => textReply('This install command has expired or was cancelled', 401)

export const installToken = ({ url }: HttpCall) => url.searchParams.get(installParams.token) || undefined
