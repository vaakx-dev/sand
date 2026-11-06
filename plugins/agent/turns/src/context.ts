import { sessions } from '@sand/chats/contract'
import { engine } from '@sand/engine/contract'
import { modelSettings } from '@sand/model/contract'
import { context } from '@sand/prompt/contract'
import { providerThreads } from '@sand/provider-threads/contract'
import { tools } from '@sand/tools/contract'
import type { Context } from 'drydock'

export const inject = { engine, providerThreads, sessions, modelSettings, context, tools }

export type TurnsContext = Context<typeof inject>
