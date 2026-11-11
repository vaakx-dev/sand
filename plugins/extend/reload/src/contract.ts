import { request, type } from '@sand/host-hub/contract'
import { z } from 'zod'

export const pluginsReload = request('plugins.reload', { input: () => z.object({}), output: type<void>(), place: 'thread' })
