import { request, type } from '@sand/host-hub/contract'
import type { SwapResult } from '@sand/host-runtimes/contract'
import { z } from 'zod'

export const pluginsReload = request('plugins.reload', { input: () => z.object({}), output: type<SwapResult>(), callers: 'any', place: 'thread' })
