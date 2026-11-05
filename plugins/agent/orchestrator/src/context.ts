import { ledger, sessions } from '@sand/chats/contract'
import { modelSettings } from '@sand/model/contract'
import { projectFiles } from '@sand/project/contract'
import { tools } from '@sand/tools/contract'
import { turns } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'

export const inject = { sessions, turns, ledger, modelSettings, projectFiles, tools }

export type OrchestratorContext = Context<typeof inject>
